# pip install flask flask-cors  |  run: python server.py
import json, os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__); CORS(app)
DB = os.path.join(os.path.dirname(__file__), "data.json")

def read():
    if not os.path.exists(DB): return {"posts": [], "groups": []}
    with open(DB, encoding="utf-8") as f: return json.load(f)

def write(d):
    with open(DB, "w", encoding="utf-8") as f: json.dump(d, f, indent=2)

def clean(item, fields):
    return {k: str(item.get(k, ""))[:500].strip() for k in fields + ["time"]}

FIELDS = {"posts": ["name", "faculty", "type", "title", "body"],
          "groups": ["faculty", "title", "body", "contact"]}

@app.get("/api/<kind>")
def get_items(kind):
    if kind not in FIELDS: return jsonify(error="unknown"), 404
    return jsonify(read()[kind])

@app.post("/api/<kind>")
def add_item(kind):
    if kind not in FIELDS: return jsonify(error="unknown"), 404
    item = clean(request.get_json(force=True), FIELDS[kind])
    if not item[FIELDS[kind][0]] or not item["title"]: return jsonify(error="missing fields"), 400
    d = read(); d[kind].insert(0, item); write(d)
    return jsonify(item), 201

if __name__ == "__main__":
    app.run(debug=True, port=5000)