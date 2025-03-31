from flask_app import create_app

if __name__ == "__main__":
    app = create_app()

    # lanzar para toda la red wifi
    # app.run(host="192.168.100.20", port=5000)
    # app.run(host="192.168.0.207", port=5000)

    # lanzar local
    app.run()
