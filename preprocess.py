import re
import nltk
from nltk.stem import WordNetLemmatizer

try:
    nltk.data.find("corpora/wordnet")
except LookupError:
    nltk.download("wordnet")

lemmatizer = WordNetLemmatizer()

def clean(text):
    text = text.lower()
    text = re.sub(r"[^a-z\s]", "", text)   # keep letters and spaces only
    words = text.split()
    # verb form first ("opening" -> "open"), then noun ("hours" -> "hour")
    words = [lemmatizer.lemmatize(lemmatizer.lemmatize(w, "v")) for w in words]
    return " ".join(words)

if __name__ == "__main__":
    print(clean("What time do you open?"))
    print(clean("Opening hours?"))
    print(clean("Are scholarships available?"))