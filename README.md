# Minni-luokittelija (Azure SWA + Functions + Blazor WASM)

Tämä projekti luokittelee kuvat luokkiin **minni**, **other-dog** ja **negative** Microsoft Azuren **Custom Vision Prediction** -palvelulla. Käyttöliittymä on yksisivuinen **Blazor WebAssembly**, ja taustalla toimii **Azure Static Web Apps**in hallinnoima **Functions-API**. Julkaisu osoitteessa: **https://minni.projectlexagon.fi**.

## Datasetti ja alkututkimus (YOLO @ Colab)
Alkuvaiheessa tehtiin kokeiluja **YOLO-luokittelulla Google Colabissa**. Pieni datasetti (Minni-kuvia eri ympäristöissä) osoitti, että ilman **negatiivisia esimerkkejä** (ei-koirakuvat, ympäristöt, tekstuurit, ihmisjoukot, kissat/linnut satunnaisesti) malli “yli-optimoi” ja antaa epärealistisen hyviä tuloksia.  
Iteration 2 -versiossa datasettiin lisättiin **negative-luokka**, joka sisälsi:
- samoja paikkoja/tekstuureja, joissa Minni esiintyi (hiekka, nurmi, lumi, taivas/horisontti, sisustustekstiilit),
- tilanteita, joissa **koira on rajattu pois** (esim. käsi + hihna),
- täysin eriaiheisia ihmiskuvia yms.

Tämä lisäsi mallin realismia ja vähensi vääriä positiivisia. Iteration 2 julkaistiin *Prediction*-resurssiin; palvelimessa sovelletaan **threshold = 0.80** (tällä asetuksella *minni*-tuloksen precision/reliability oli käytännössä erinomainen tämän projektin tarpeisiin).

## Miksi Custom Vision & Azure CI/CD?
Colab + YOLO antoi hyvän alkukuvan, mutta tavoitteena oli **kokonainen pilvipalvelu**, jossa:
- **Mallin isännöinti ja inferenssi** on hallinnoitu (Custom Vision Prediction),
- **Täysin automaattinen julkaisu** GitHub → Azure (**Static Web Apps** + **Actions**),
- **No-ops hosting**: ei omia VM:iä, ei TLS/Apache-ylläpitoa, globaali edge suoraan Azurelta.

Näin syntyi tuotantokelpoinen, helposti ylläpidettävä ja kustannustehokas kokonaisuus, joka toimii myös hyvänä **Azure-oppimisprojektina**.

---

## Arkkitehtuuri lyhyesti
- **UI (SWA):** Blazor WASM palvellaan reunalta (CDN).  
- **API (Functions):** kaksi endpointtia
  - `POST /api/classify` — JSON `{ "imageUrl": "https://..." }`
  - `POST /api/classify-image` — `application/octet-stream` (raakakuva)
- **Prediction (Custom Vision):** julkaistu Iteration2; **threshold 0.80** sovelletaan palvelimessa (`decision = unknown`, jos topProb < 0.80).

Backend kutsuu sisäisesti Custom Visionin Prediction-URL:eja (URL- tai image-variantti) `Prediction-Key`-otsikolla ja palauttaa järjestetyt ennusteet + decisionin.

## Ympäristömuuttujat (SWA → Configuration)
- `PREDICTION_ENDPOINT`
- `PROJECT_ID`
- `PUBLISHED_NAME`
- `PREDICTION_KEY`
- `THRESHOLD`

## CI/CD
- **Static Web App** loi automaattisesti GitHub Actions -workflow’n.  
- `app_location: "Client"`, `api_location: "api"`, `output_location: "wwwroot"`.  
- `git push main` → Actions **buildaa** Blazorin ja Functionsin → **deployaa** SWA:han.
