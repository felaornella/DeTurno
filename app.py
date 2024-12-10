from flask import Flask, render_template, redirect, send_file, url_for
from math import radians, sin, cos, sqrt, atan2
import requests
from bs4 import BeautifulSoup
import traceback

app = Flask(__name__) 


def haversine(lat1, lon1, lat2, lon2):
    # Earth radius in kilometers
    R = 6371.0
    # Convert coordinates from degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    # Differences
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    # Haversine formula
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    # Distance in kilometers
    return R * c



def osde_farmacias():
    response_210 = requests.get("https://gateway.api-osde.com.ar/os-cartillacliente/prestadores?&distancia=80&latitud=-34.9204948&longitud=-57.95356570000001&orden=6&page=1&plan=21&size=1600&version=3&cod_especialidades=700")
    response_310 = requests.get("https://gateway.api-osde.com.ar/os-cartillacliente/prestadores?&distancia=80&latitud=-34.9204948&longitud=-57.95356570000001&orden=6&page=1&plan=31&size=1600&version=3&cod_especialidades=700")
    response_410 = requests.get("https://gateway.api-osde.com.ar/os-cartillacliente/prestadores?&distancia=80&latitud=-34.9204948&longitud=-57.95356570000001&orden=6&page=1&plan=41&size=1600&version=3&cod_especialidades=700")
    response_450 = requests.get("https://gateway.api-osde.com.ar/os-cartillacliente/prestadores?&distancia=80&latitud=-34.9204948&longitud=-57.95356570000001&orden=6&page=1&plan=45&size=1600&version=3&cod_especialidades=700")
    response_510 = requests.get("https://gateway.api-osde.com.ar/os-cartillacliente/prestadores?&distancia=80&latitud=-34.9204948&longitud=-57.95356570000001&orden=6&page=1&plan=51&size=1600&version=3&cod_especialidades=700")

    geos = {}

    try:
        geos["210"] = [
            {"lat": l.split(",")[0], "long": l.split(",")[1]} 
            for l in list(
                set(
                    [f"{g['ubicacion']['lat']},{g['ubicacion']['lon']}" for f in response_210.json()["prestadores"] for g in f["direccion_Prestacion"]]
                )
            )
        ]
    except:
        geos["210"] = []
        traceback.print_exc()
        print("Error relevando direcciones de Plan 210")

    try:
        geos["310"] = [
            {"lat": l.split(",")[0], "long": l.split(",")[1]} 
            for l in list(
                set(
                    [f"{g['ubicacion']['lat']},{g['ubicacion']['lon']}" for f in response_310.json()["prestadores"] for g in f["direccion_Prestacion"]]
                )
            )
        ]
    except:
        geos["310"] = []
        print("Error relevando direcciones de Plan 310")

    try:
        geos["410"] = [
            {"lat": l.split(",")[0], "long": l.split(",")[1]} 
            for l in list(
                set(
                    [f"{g['ubicacion']['lat']},{g['ubicacion']['lon']}" for f in response_410.json()["prestadores"] for g in f["direccion_Prestacion"]]
                )
            )
        ]
    except:
        geos["410"] = []
        print("Error relevando direcciones de Plan 410")

    try:
        geos["450"] = [
            {"lat": l.split(",")[0], "long": l.split(",")[1]} 
            for l in list(
                set(
                    [f"{g['ubicacion']['lat']},{g['ubicacion']['lon']}" for f in response_450.json()["prestadores"] for g in f["direccion_Prestacion"]]
                )
            )
        ]
    except:
        geos["450"] = []
        print("Error relevando direcciones de Plan 450")

    try:
        geos["510"] = [
            {"lat": l.split(",")[0], "long": l.split(",")[1]} 
            for l in list(
                set(
                    [f"{g['ubicacion']['lat']},{g['ubicacion']['lon']}" for f in response_510.json()["prestadores"] for g in f["direccion_Prestacion"]]
                )
            )
        ]
    except:
        geos["510"] = []
        print("Error relevando direcciones de Plan 510")


    return geos


def fetch_pharmacy_data():
    try:
        # Perform a GET request to the URL
        url = "https://www.colfarmalp.org.ar/turnos-la-plata"
        response = requests.get(url)
        
        # Check if the response is successful
        if response.status_code != 200:
            raise Exception(f"HTTP error! status: {response.status_code}")
        
        # Parse the HTML response using BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')


        # Select the list of pharmacies
        listado_farmacias = soup.select_one(".turnos").select(".tr")
        
        if not listado_farmacias:
            raise Exception("No pharmacy list found in the response.")
        
        info_farmacias = []

        # Iterate through the pharmacies and extract the required information
        for f in listado_farmacias[1:]:  # Skip the first row (header)
            data = {
                "nombre": "",
                "direccion": "",
                "telefono": "",
                "zona": "",
                "geo": {
                    "lat": "",
                    "long": ""
                }
            }

            # Extract and clean data from the columns
            cells = f.select(".td")
            data["nombre"] = cells[0].get_text().replace("\n", "").replace("\t", "").title().strip()
            data["direccion"] = cells[1].get_text().replace("\n", "").replace("\t", "").replace("Dirección","").strip()
            data["zona"] = cells[2].get_text().replace("\n", "").replace("\t", "").replace("Zona","").strip()
            data["telefono"] = cells[3].get_text().replace("\n", "").replace("\t", "").replace("Teléfono", "").strip()
            data["osde"] = {}
            # Extract geo data from the href
            geo_link = cells[4].find("a")["href"] if cells[4].find("a") else None
            if geo_link:
                lat, long = geo_link.split("destination=")[1].split(",")

                if lat == long == "0":
                    data["geo"]["lat"] = "-34.920494"
                    data["geo"]["long"] = "-57.953568"
                else:
                    data["geo"]["lat"] = lat
                    data["geo"]["long"] = long

            # osde_geos = osde_farmacias()
            # data["osde"]["210"] = len(list(filter(lambda og: haversine(float(data["geo"]["lat"]), float(data["geo"]["long"]), float(og["lat"]), float(og["long"])) < 0.025, osde_geos["210"]))) > 0
            # data["osde"]["310"] = len(list(filter(lambda og: haversine(float(data["geo"]["lat"]), float(data["geo"]["long"]), float(og["lat"]), float(og["long"])) < 0.025, osde_geos["310"]))) > 0
            # data["osde"]["410"] = len(list(filter(lambda og: haversine(float(data["geo"]["lat"]), float(data["geo"]["long"]), float(og["lat"]), float(og["long"])) < 0.025, osde_geos["410"]))) > 0
            # data["osde"]["450"] = len(list(filter(lambda og: haversine(float(data["geo"]["lat"]), float(data["geo"]["long"]), float(og["lat"]), float(og["long"])) < 0.025, osde_geos["450"]))) > 0
            # data["osde"]["510"] = len(list(filter(lambda og: haversine(float(data["geo"]["lat"]), float(data["geo"]["long"]), float(og["lat"]), float(og["long"])) < 0.025, osde_geos["510"]))) > 0


            info_farmacias.append(data)

        return info_farmacias

    except Exception as e:
        traceback.print_exc()
        print(f"Error fetching or processing data: {e}")
        return []

@app.route("/") 
def home(): 
    return render_template("home.html", pharmacies = fetch_pharmacy_data())

@app.errorhandler(404)
def page_not_found(e):
    return redirect("/")

@app.route("/files/<nombre>", methods=["GET"])
def logos(nombre):
    return send_file(f"./static/{nombre}")

if __name__ == "__main__": 
    app.run(debug=True) 
    # app.run(host="192.168.0.207", port=5000)
