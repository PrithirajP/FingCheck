Input1=file1;
Input2=file2;
list_of_lists = 2d-list of words present in each line.
l=list of the modal verbs 

class REReplacer(object):
  def __init__(self, patterns=R_patterns):
    self.patterns = [(re.compile(regex), repl) for (regex, repl) in patterns]

  def replace(self, text):
    for (pattern, repl) in self.patterns:
      text = re.sub(pattern, repl, text)
    return text


list_of_lists = [(line.strip()).split() for line in file1]

for j in range(len(list_of_lists)):
  i=0
  ans=""
  while i<len(list_of_lists[j]):
      ans+= list_of_lists[j][i]+" ";
      i+=1
  word=REReplacer()  #call the regex replace method inside REReplacer class defined above.
  ans=word.replace(ans)