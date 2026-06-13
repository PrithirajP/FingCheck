import cv2
import numpy as np
from scipy import ndimage
from scipy.spatial.distance import cdist
from sklearn.cluster import SpectralClustering, KMeans
from skimage.morphology import thin
import warnings

warnings.filterwarnings('ignore')

def extract_ridge_components(binary, enhanced, min_size=20):
    thinned = thin(binary > 0).astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thinned, 8)
    gx = cv2.Sobel(enhanced.astype(np.float64), cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(enhanced.astype(np.float64), cv2.CV_64F, 0, 1, ksize=3)
    components = []
    
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] < min_size: continue
        mask = labels == i
        ys, xs = np.where(mask)
        vx_sum = np.sum(2 * gx[mask] * gy[mask])
        vy_sum = np.sum(gx[mask]**2 - gy[mask]**2)
        energy_sum = np.sum(gx[mask]**2 + gy[mask]**2)
        orientation = 0.5 * np.arctan2(vx_sum, vy_sum) % np.pi
        coherence = np.sqrt(vx_sum**2 + vy_sum**2) / (energy_sum + 1e-6)
        components.append({
            'id': i, 'thinned_mask': mask, 'centroid': (centroids[i][1], centroids[i][0]),
            'orientation': orientation, 'coherence': coherence
        })
    return components, thinned

def build_affinity_matrix(components, max_dist=80, ori_weight=0.7, spatial_weight=0.3):
    n = len(components)
    centroids = np.array([c['centroid'] for c in components])
    oris = np.array([c['orientation'] for c in components])
    cohs = np.array([c['coherence'] for c in components])
    spatial_dist = cdist(centroids, centroids)
    affinity = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            if spatial_dist[i, j] > max_dist: continue
            spatial_s = np.exp(-spatial_dist[i, j]**2 / (2 * (max_dist/2.5)**2))
            ori_diff = min(abs(oris[i] - oris[j]), np.pi - abs(oris[i] - oris[j]))
            ori_s = np.cos(2 * ori_diff)
            if ori_s < -0.2: continue
            affinity[i, j] = affinity[j, i] = (ori_weight * (ori_s + 1)/2 + spatial_weight * spatial_s) * (0.5 + 0.5 * cohs[i] * cohs[j])
    return affinity

def cluster_components(components, affinity):
    n = len(components)
    if n < 2: return [0]*n
    try:
        return SpectralClustering(n_clusters=2, affinity='precomputed', n_init=30, random_state=42).fit_predict(affinity + np.eye(n)*0.01).tolist()
    except:
        return [0]*n

def spatial_fallback_split(binary):
    h, w = binary.shape
    sep1, sep2 = np.zeros((h, w), dtype=np.uint8), np.zeros((h, w), dtype=np.uint8)
    mid = w // 2
    sep1[:, :mid][binary[:, :mid] > 0] = 255
    sep2[:, mid:][binary[:, mid:] > 0] = 255
    return sep1, sep2

def reconstruct_full_ridges(components, labels, binary, thinned):
    h, w = binary.shape
    skel0, skel1 = np.zeros((h, w)), np.zeros((h, w))
    for comp, label in zip(components, labels):
        if label == 0: skel0[comp['thinned_mask']] = 1
        else: skel1[comp['thinned_mask']] = 1
    if skel0.sum() == 0 or skel1.sum() == 0: return spatial_fallback_split(binary)
    dist0 = ndimage.distance_transform_edt(1 - skel0)
    dist1 = ndimage.distance_transform_edt(1 - skel1)
    sep1, sep2 = np.zeros((h, w), dtype=np.uint8), np.zeros((h, w), dtype=np.uint8)
    sep1[(binary > 0) & (dist0 <= dist1)] = 255
    sep2[(binary > 0) & (dist0 > dist1)] = 255
    return sep1, sep2

def refine_boundary(sep_1, sep_2, enhanced, block_size=12):
    # Simplified boundary refinement for stability
    return sep_1, sep_2

def clean_separation(sep, min_size=20):
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(sep, 8)
    cleaned = np.zeros_like(sep)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_size: cleaned[labels == i] = 255
    return cleaned