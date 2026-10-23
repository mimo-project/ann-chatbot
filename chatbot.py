import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import json, pickle, random
import numpy as np
from keras.models import load_model
from preprocess import clean

THRESHOLD = 0.70   # below this confidence, the bot uses the fallback
FALLBACK = ("Sorry, I didn't get that. Try asking about admissions, courses, "
            "fees, scholarships or placements, or call 70031 62601.")

# Load everything once, when the file starts
model = load_model("model/chatbot_model.keras")
with open("model/vectorizer.pkl", "rb") as f:
    vec = pickle.load(f)
with open("model/labels.pkl", "rb") as f:
    le = pickle.load(f)
with open("intents.json", encoding="utf-8") as f:
    data = json.load(f)

responses = {i["tag"]: i["responses"] for i in data["intents"]}


def predict_intent(text):
    """Return (intent tag, confidence) for one message."""
    vector = vec.transform([clean(text)]).toarray()
    if vector.sum() == 0:                 # no known words at all
        return None, 0.0
    probs = model.predict(vector, verbose=0)[0]
    idx = int(np.argmax(probs))
    return le.classes_[idx], float(probs[idx])


def get_response(text):
    """Take one user message, return one bot reply."""
    if not text.strip():
        return "Please type a question."
    tag, conf = predict_intent(text)
    if tag is None or conf < THRESHOLD:
        return FALLBACK
    return random.choice(responses[tag])


if __name__ == "__main__":
    DEBUG = True    # shows the predicted intent and confidence
    print("Brainware helpdesk bot (type 'quit' to exit)\n")
    while True:
        msg = input("You: ")
        if msg.strip().lower() in ("quit", "exit"):
            break
        if DEBUG:
            tag, conf = predict_intent(msg)
            print(f"   [intent={tag}, confidence={conf:.2f}]")
        print("Bot:", get_response(msg), "\n")