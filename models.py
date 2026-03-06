from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Disk(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    serial_number = db.Column(db.String(120), unique=True, nullable=False)

    added_date = db.Column(db.DateTime, default=datetime.utcnow)


class EraseEvent(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    serial_number = db.Column(db.String(120), nullable=False)

    erase_date = db.Column(db.DateTime, default=datetime.utcnow)

    operator = db.Column(db.String(120))

    method = db.Column(db.String(50))

    duplicate = db.Column(db.Boolean, default=False)