res=[]
for j in range(len(list_of_lists)):
  i=0
  ans="" 
  while i<len(list_of_lists[j])-1:
    if(list_of_lists[j][i] in l and list_of_lists[j][i+1]=="not"):
      ans+= list_of_lists[j][i]+"##"+list_of_lists[j][i+1]+" ";
      i+=2
    else:
      ans+= list_of_lists[j][i]+" ";
      i+=1
  if i<len(list_of_lists[j]):
    ans+=list_of_lists[j][i]
  append this string(ans) to a new list res
file2.write('\n'.join(res))


"""
OUTPUT:
can't -> can not->can##not
shouldn't -> should not ->should##not
"""
