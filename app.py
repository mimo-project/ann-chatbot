from flask import Flask, request, jsonify, render_template
from chatbot import get_response

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    reply = get_response(message)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    # use_reloader=False stops Flask from loading TensorFlow twice
    app.run(debug=True, use_reloader=False)