# AutoTARA

<div align="center">
  <img src="https://github.com/shirohacker/AutoTARA/blob/main/images/auto-tara-logo-2.png" alt="AutoTARA Logo" width="300" />
  <h1>AutoTARA</h1>
  
  <div>
    <img src="https://img.shields.io/badge/vuejs-%2335495e.svg?style=for-the-badge&logo=vuedotjs&logoColor=%234FC08D" alt="Vue.js" />
    <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/bootstrap-%238511FA.svg?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap" />
    <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB" alt="Express.js" />
    <img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </div>
</div>

AutoTARA (Automated Threat Analysis and Risk Assessment) is a web-based framework that supports the ISO/SAE 21434 TARA process for the automotive industry. By integrating the MITRE TARA (CTSA/CRRA) methodology, Meta Attack Language (MAL), and LLMs, AutoTARA provides scalable and quantitative prioritization of security countermeasures.

## 🔍 Preview

### 🧩 Visual Threat Modeling
<div align="center">
  <img src="https://github.com/shirohacker/AutoTARA/blob/main/images/diagram-sample.png" alt="Threat Modeling" width="100%" />
</div>

### 🛡️ CTSA (Cyber Threat Susceptibility Analysis)
<div align="center">
  <img src="https://github.com/shirohacker/AutoTARA/blob/main/images/ctsa_sample.png" alt="CTSA" width="100%" />
</div>

### 📊 CRRA (Cyber Risk Remediation Assessment)
<div align="center">
  <img src="https://github.com/shirohacker/AutoTARA/blob/main/images/crra_sample.png" alt="CRRA" width="100%" />
</div>

### ⚔️ Attack Simulation
<div align="center">
  <img src="https://github.com/shirohacker/AutoTARA/blob/main/images/attackstep_sample.png" alt="Attack Simulation" width="100%" />
</div>

## 🚀 Key Features

*   **Visual Threat Modeling:** Build and edit complex system diagrams using an intuitive graph editor powered by AntV X6.
*   **Detailed Property Management:** Configure specific properties for each component and connection within the system.
*   **Threat Management:** Systematically identify, categorize, and manage cybersecurity threats associated with system elements.
*   **Attack Simulation:** Simulate potential attack paths to discover vulnerabilities and validate security assumptions.
*   **Risk Assessment Modules:** Built-in support for standardized assessment methodologies, including CTSA (Cyber Threat Susceptibility Analysis) and CRRA (Cyber Risk Remediation Assessment).
*   **TARA Results Dashboard:** Provides dashboards for generated attack paths, including damage/threat scenarios and attack paths.

## 🛠️ Technology Stack

This project is built on a modern full-stack architecture.

### Frontend
*   **Core Framework:** [Vue 3](https://vuejs.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **State Management:** [Pinia](https://pinia.vuejs.org/)
*   **Diagram Engine:** [AntV X6](https://x6.antv.vision/)
*   **UI Framework:** [Bootstrap 5](https://getbootstrap.com/) and [FontAwesome](https://fontawesome.com/)

### Backend
*   **Runtime:** Node.js
*   **Framework:** [Express.js](https://expressjs.com/) (v5)
*   **Architecture:** Layered architecture (Controllers, Services, Repositories)

### Database
*   **Database:** PostgreSQL 17
*   **Containerization:** Docker and Docker Compose
*   **Driver:** [node-postgres (pg)](https://node-postgres.com/)

## 📦 Project Setup

### Prerequisites

*   **Node.js** (v20.19.0 or later recommended)
*   **npm**
*   **Docker Desktop** or **Docker Engine + Docker Compose**

### Installation and Running

This project consists of four services:

*   **db**: PostgreSQL 17
*   **mal-simulator**: FastAPI-based MAL simulation server
*   **tara-server**: Node.js/Express backend
*   **tara-vue**: Vue 3 + Vite frontend

The recommended way to run the full stack is to use the root `docker-compose.yml`.

#### 1. Start All Services with Docker Compose

```sh
docker compose up -d --build
```

This starts:

*   Frontend: `http://localhost:1234`
*   Backend API: `http://localhost:4000/api`
*   MAL Simulator API: `http://localhost:8000`
*   PostgreSQL: `localhost:5432`

#### 2. Stop Services

```sh
docker compose down
```

#### 3. Override Ports

If a host port is already in use, you can override it at startup.

Example: run PostgreSQL on `5433` instead of `5432`.

```sh
DB_HOST_PORT=5433 docker compose up -d --build
```

Available overrides:

*   `DB_HOST_PORT` (default: `5432`)
*   `MALSIM_HOST_PORT` (default: `8000`)
*   `TARA_SERVER_HOST_PORT` (default: `4000`)
*   `TARA_VUE_HOST_PORT` (default: `1234`)

#### 4. Backend Environment Variables

The backend service loads environment variables from [`tara.server/.env`](/home/sane/vehiclesec/AutoTARA/tara.server/.env), including Gemini-related settings.

Database and simulator connection values are overridden by Docker Compose so that containers can communicate over the internal Docker network.

#### 5. Optional Local Development

If needed, you can still run each service individually without Docker.

Database only:

```sh
cd db
docker compose up -d
```

Backend:

```sh
cd tara.server
npm install
npm run dev
```

Frontend:

```sh
cd tara.vue
npm install
npm run dev
```

MAL simulator:

```sh
cd mal-simulator.server
pip install -r requirements.txt
python api_server.py
```

## 🐳 Docker Information

The full stack is managed through the root [`docker-compose.yml`](/home/sane/vehiclesec/AutoTARA/docker-compose.yml).

*   **Database User:** `user`
*   **Database Name:** `tara_db`
*   **Database Volume:** `pgdata`
*   **Database Init Scripts:** [`db/init`](/home/sane/vehiclesec/AutoTARA/db/init)
*   **MITRE Data Files:** [`db/data`](/home/sane/vehiclesec/AutoTARA/db/data)

## 👏 Acknowledgements

This project incorporates code and concepts from **[OWASP Threat Dragon](https://github.com/OWASP/threat-dragon)**.
We thank the OWASP community for its significant contributions to open-source threat modeling tools.
Threat Dragon is licensed under the [Apache License 2.0](https://github.com/OWASP/threat-dragon/blob/main/LICENSE).
