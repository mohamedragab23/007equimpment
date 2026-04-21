# -*- coding: utf-8 -*-
"""
تطبيق Flask - نظام إدارة مخزون معدات طلبات - وكالة 007
"""
import os
from pathlib import Path
# تحميل .env من جذر المشروع (قبل أي استيراد يستخدم os.environ)
_env_path = Path(__file__).resolve().parent.parent / '.env'
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path)
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from api.auth import auth_bp
from api.sync import sync_bp
from api.supervisors import supervisors_bp
from api.equipment import equipment_bp
from api.orders import orders_bp
from api.deductions import deductions_bp
from api.apartments import apartments_bp
from api.motorcycles import motorcycles_bp


def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-change-in-production')
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['JSON_AS_ASCII'] = False
    CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://127.0.0.1:5173'])

    app.register_blueprint(auth_bp)
    app.register_blueprint(sync_bp)
    app.register_blueprint(supervisors_bp)
    app.register_blueprint(equipment_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(deductions_bp)
    app.register_blueprint(apartments_bp)
    app.register_blueprint(motorcycles_bp)

    @app.route('/api/health')
    def health():
        return {'ok': True, 'service': '007-equipment-api'}

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(root, 'uploads')

    @app.route('/uploads/<path:path>')
    def serve_upload(path):
        return send_from_directory(uploads_dir, path)

    @app.errorhandler(Exception)
    def handle_error(e):
        import traceback
        app.logger.exception(e)
        body = {'ok': False, 'error': str(e)}
        if app.debug:
            body['detail'] = traceback.format_exc()
        return jsonify(body), 500

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
