from flask import Flask, render_template, request, jsonify, send_file, redirect, session
from config import Config
from models import db, Disk, EraseEvent
from datetime import datetime
import csv
import os
from openpyxl import Workbook
from reportlab.pdfgen import canvas

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

with app.app_context():
    db.create_all()


@app.route("/login", methods=["GET","POST"])
def login():

    if request.method == "POST":

        session["operator"] = request.form["operator"]

        return redirect("/")

    return render_template("login.html")


@app.route("/logout")
def logout():

    session.pop("operator", None)

    return redirect("/login")


@app.route("/")
def index():

    if "operator" not in session:
        return redirect("/login")

    disks = Disk.query.all()

    erased = {e.serial_number for e in EraseEvent.query.all()}

    return render_template(
        "index.html",
        disks=disks,
        erased=erased,
        operator=session["operator"]
    )


@app.route("/upload", methods=["POST"])
def upload():

    if "operator" not in session:
        return jsonify({"status": "unauthorized"}), 401

    sns: list[str] = []

    # Accept either a text file upload (one SN per line) OR raw text in a form field.
    if "file" in request.files and request.files["file"]:
        file = request.files["file"]
        text = file.read().decode(errors="ignore")
        sns = [line.strip() for line in text.splitlines()]
    else:
        text = (request.form.get("text") or "").strip()
        if text:
            sns = [line.strip() for line in text.splitlines()]

    added = 0
    skipped = 0

    for sn in sns:
        if not sn:
            continue
        if Disk.query.filter_by(serial_number=sn).first():
            skipped += 1
            continue
        db.session.add(Disk(serial_number=sn))
        added += 1

    db.session.commit()

    return jsonify({"status": "ok", "added": added, "skipped": skipped})


@app.route("/scan", methods=["POST"])
def scan():

    if "operator" not in session:
        return jsonify({"status": "unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").strip()

    if not code:
        return jsonify({"status": "empty"}), 400

    disk = Disk.query.filter_by(serial_number=code).first()

    if not disk:
        return jsonify({"status":"not_found"})

    existing = EraseEvent.query.filter_by(serial_number=code).first()

    if existing:
        return jsonify({"status":"duplicate"})

    event = EraseEvent(
        serial_number=code,
        operator=session.get("operator"),
        method="LAVINA",
        erase_date=datetime.utcnow()
    )

    db.session.add(event)
    db.session.commit()

    return jsonify({"status":"ok"})
    

@app.route("/reset")
def reset():

    if "operator" not in session:
        return redirect("/login")

    # Start from scratch: clear uploaded SN list + scan events.
    EraseEvent.query.delete()
    Disk.query.delete()

    db.session.commit()

    return redirect("/")


@app.route("/report/csv")
def report_csv():

    if "operator" not in session:
        return redirect("/login")

    disks = Disk.query.order_by(Disk.serial_number.asc()).all()
    erased = {e.serial_number for e in EraseEvent.query.all()}

    path = "reports/report.csv"

    os.makedirs("reports", exist_ok=True)

    with open(path,"w",newline="") as f:

        writer = csv.writer(f)

        writer.writerow(["SN","ERASED"])

        for d in disks:
            writer.writerow([d.serial_number, "✓" if d.serial_number in erased else ""])

    return send_file(path,as_attachment=True)


@app.route("/report/xlsx")
def report_xlsx():

    if "operator" not in session:
        return redirect("/login")

    disks = Disk.query.order_by(Disk.serial_number.asc()).all()
    erased = {e.serial_number for e in EraseEvent.query.all()}

    wb = Workbook()

    ws = wb.active

    ws.append(["SN","ERASED"])

    for d in disks:
        ws.append([d.serial_number, "✓" if d.serial_number in erased else ""])

    path="reports/report.xlsx"

    os.makedirs("reports", exist_ok=True)

    wb.save(path)

    return send_file(path,as_attachment=True)


@app.route("/report/pdf")
def report_pdf():

    if "operator" not in session:
        return redirect("/login")

    disks = Disk.query.order_by(Disk.serial_number.asc()).all()
    erased = {e.serial_number for e in EraseEvent.query.all()}

    path="reports/report.pdf"

    os.makedirs("reports", exist_ok=True)

    c=canvas.Canvas(path)

    c.drawString(50,820,"HDD Destruction Table")
    c.drawString(50,800,"SN")
    c.drawString(420,800,"ERASED")

    y=780

    for d in disks:
        c.drawString(50,y,str(d.serial_number))
        c.drawString(440,y,"✓" if d.serial_number in erased else "")
        y-=18
        if y < 60:
            c.showPage()
            c.drawString(50,820,"HDD Destruction Table (cont.)")
            c.drawString(50,800,"SN")
            c.drawString(420,800,"ERASED")
            y=780

    c.save()

    return send_file(path,as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True)