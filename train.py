import json, pickle, os
import numpy as np
import matplotlib
matplotlib.use("Agg")                      # save plots without opening windows
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from keras.models import Sequential
from keras.layers import Input, Dense, Dropout
from keras.callbacks import EarlyStopping
from keras.utils import to_categorical
from preprocess import clean

# 1. Load data: (sentence, tag) pairs
with open("intents.json", encoding="utf-8") as f:
    data = json.load(f)

X, y = [], []
for intent in data["intents"]:
    for pattern in intent["patterns"]:
        X.append(clean(pattern))
        y.append(intent["tag"])
print(f"{len(X)} patterns, {len(set(y))} intents")

# 2. Split BEFORE vectorizing, so the test score is honest
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)

# 3. Vectorize (TF-IDF) and encode labels
vec = TfidfVectorizer()
Xtr = vec.fit_transform(X_tr).toarray()
Xte = vec.transform(X_te).toarray()

le = LabelEncoder().fit(y)
n = len(le.classes_)
ytr = to_categorical(le.transform(y_tr), n)
yte = to_categorical(le.transform(y_te), n)

# 4. Build the ANN
model = Sequential([
    Input(shape=(Xtr.shape[1],)),
    Dense(128, activation="relu"),
    Dropout(0.5),
    Dense(64, activation="relu"),
    Dropout(0.5),
    Dense(n, activation="softmax"),
])
model.compile(loss="categorical_crossentropy",
              optimizer="adam", metrics=["accuracy"])
model.summary()

# 5. Train (stops early if validation stops improving)
stop = EarlyStopping(monitor="val_loss", patience=20,
                     restore_best_weights=True)
history = model.fit(Xtr, ytr, validation_data=(Xte, yte),
                    epochs=200, batch_size=8, callbacks=[stop], verbose=1)

loss, acc = model.evaluate(Xte, yte, verbose=0)
print(f"\nTest accuracy: {acc:.2%}")

# 6. Save the 3 artifacts
os.makedirs("model", exist_ok=True)
os.makedirs("reports", exist_ok=True)
model.save("model/chatbot_model.keras")
with open("model/vectorizer.pkl", "wb") as f: pickle.dump(vec, f)
with open("model/labels.pkl", "wb") as f: pickle.dump(le, f)

# 7. Save graphs for your report
for key, name in [("loss", "loss_curve"), ("accuracy", "accuracy_curve")]:
    plt.figure()
    plt.plot(history.history[key], label="train")
    plt.plot(history.history["val_" + key], label="validation")
    plt.xlabel("epoch"); plt.ylabel(key); plt.legend()
    plt.title(key.capitalize())
    plt.savefig(f"reports/{name}.png"); plt.close()
print("Saved model/ and reports/")

pred = model.predict(Xte).argmax(axis=1)
true = yte.argmax(axis=1)
for s, t, p in zip(X_te, true, pred):
    if t != p:
        print(f"{s!r}: true={le.classes_[t]}, predicted={le.classes_[p]}")