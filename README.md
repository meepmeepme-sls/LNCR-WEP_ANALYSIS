# LNCR-WEP_ANALYSIS ⚡
### Combat Robotics Weapon MOI, Tip Speed & Dynamics Analyzer
*Developed for Late Night Combat Robotics · Engineered for BattleBots, NHRL & Robot Combat Builders*

[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge)](LICENSE)
[![Built with React](https://img.shields.io/badge/Built%20with-React%2019%20%2B%20Three.js-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)

A modern, responsive, 100% free-to-host web application designed for combat robotics engineers to upload `.step` or `.stp` CAD models of spinning blades, beater bars, or drums, preview the weapon with its rotation axis, specify materials, and calculate exact Moment of Inertia (MOI), Tip Speed, Stored Kinetic Energy, and dynamic balance.

---

## 🚀 Key Features

- **Browser-Side STEP File Parsing**:
  - Drag & drop or upload `.step` / `.stp` files directly in your web browser.
  - Powered by **OpenCASCADE WebAssembly (WASM)** (`occt-import-js`) — runs 100% locally on your machine with zero server costs, zero upload delays, and complete CAD privacy.

- **Exact Mass & MOI Integration**:
  - Implements the exact **Divergence Theorem** (polyhedral tetrahedral boundary integration) over triangular faces.
  - Computes exact Volume ($V$), Total Mass ($M$), Center of Mass ($\mathbf{C}$), and the full $3 \times 3$ Mass Moment of Inertia Tensor ($I_{xx}, I_{yy}, I_{zz}, I_{xy}, I_{yz}, I_{zx}$).
  - Computes exact MOI around any arbitrary rotation axis using the generalized parallel axis theorem:
    $$I_{\text{axis}} = \mathbf{u}^T I_{\mathbf{C}} \mathbf{u} + M \cdot r_{\perp}^2$$
  - Instant unit switching: $\text{lb}\cdot\text{in}^2$, $\text{oz}\cdot\text{in}^2$, $\text{kg}\cdot\text{m}^2$ (SI), $\text{g}\cdot\text{cm}^2$, and $\text{lb}\cdot\text{ft}^2$ with 1-click clipboard copy.

- **Interactive 3D Viewport**:
  - High-performance Three.js renderer with realistic metallic PBR materials (Steel, Titanium, Aluminum, Clear Polycarbonate).
  - **Rotation Axle Visualizer**: Glowing cyan axle rod with reference line and circular spin direction arrow (CW / CCW).
  - **Live 3D Spinning Animation**: Watch your weapon spin around its configured axis with play/pause and visual speed controls.
  - **Center of Mass (COM) Target**: Neon green marker with coordinates tooltip.
  - **Tip Sweep Perimeter**: Cutting circle/disc indicating the outer sweep radius of the teeth.
  - **Static Imbalance Warning Line**: If the weapon is eccentric, a bright red indicator shows the offset distance between the COM and the rotation axle.
  - **Pick Axle Point Tool**: Click directly on any surface or bore hole in the 3D model to relocate the axle origin.
  - Preset camera angles (ISO, Top, Front, Right) and PNG screenshot capture.

- **Weapon Materials Library**:
  - **Steels**: AR500 / AR400 Armor Steel ($7.85 \text{ g/cm}^3$), S7 Shock Tool Steel ($7.83 \text{ g/cm}^3$), 4140 Chromoly Steel ($7.85 \text{ g/cm}^3$), Mild Steel A36 ($7.85 \text{ g/cm}^3$).
  - **Titaniums**: Titanium Grade 5 Ti-6Al-4V ($4.43 \text{ g/cm}^3$), Titanium Grade 2 CP ($4.51 \text{ g/cm}^3$).
  - **Aluminums**: Aluminum 7075-T6 ($2.81 \text{ g/cm}^3$), Aluminum 6061-T6 ($2.70 \text{ g/cm}^3$).
  - **Polymers & 3D Prints**: Polycarbonate / Lexan ($1.20 \text{ g/cm}^3$), UHMW-PE ($0.94 \text{ g/cm}^3$), TPU 95A ($1.21 \text{ g/cm}^3$ with adjustable 20%–100% infill density slider), CF-Nylon / Onyx ($1.15 \text{ g/cm}^3$).
  - **Custom Material**: Enter any custom density in $\text{g/cm}^3$ or $\text{lb/in}^3$.

- **Combat Robotics Dynamics Telemetry**:
  - **Target RPM Slider & Presets**: Configurable from 1,000 to 25,000 RPM.
  - **Stored Kinetic Energy ($KE = \frac{1}{2} I \omega^2$)**: Real-time display in Joules ($\text{J}$) and Foot-Pounds ($\text{ft}\cdot\text{lbf}$) with weight class benchmark scales (Fairyweight to Heavyweight).
  - **Tip Speed ($v = \omega R_{\text{tip}}$)**: Display in $\text{mph}$ and $\text{m/s}$ with **BattleBots 250 mph rule checker** alert.
  - **Static & Dynamic Balance Check**: Calculates static eccentricity ($e$) and bearing centrifugal force ($F = M \cdot e \cdot \omega^2$ in lbf and Newtons) to predict vibration and gyro instability.

- **Export & Reporting**:
  - Full Engineering Text Summary Report.
  - JSON Data Export for combat robotics logs and simulation.
  - Printable / PDF-ready view.
  - High-res PNG snapshot from 3D viewport.

- **Pre-Loaded Sample Models**:
  - 6" Beetleweight Spinner Bar (Symmetric 4-bolt hub)
  - 6" Anti-Vertical Tool Steel Weapon Bar (Asymmetric single-bite tooth)

---

## 🌐 How to Host for FREE on Cloudflare Pages

Because **LNCR-WEP_ANALYSIS** is built as a pure client-side static Single Page Application (SPA) using WebAssembly, it requires **zero backend servers or databases**. You can host it 100% free forever on **Cloudflare Pages** with unlimited bandwidth, global SSL, and lightning-fast edge CDN caching.

### Option 1: GitHub / Git Integration (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/LNCR-WEP_ANALYSIS.git
   git branch -M main
   git push -u origin main
   ```
2. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** → **Create Application** → **Pages**.
3. Click **Connect to Git** and select your `LNCR-WEP_ANALYSIS` repository.
4. Set the build configuration:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Cloudflare Pages will build the app and give you a free `*.pages.dev` URL (or let you link your custom domain for free)!

---

### Option 2: Direct Upload (Drag & Drop in 30 Seconds)
If you don't want to connect Git:
1. Double-click `build_dist.bat` to generate the production `dist/` directory.
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) → **Workers & Pages** → **Create Application** → **Pages** → **Upload Assets**.
3. Name your project (e.g. `lncr-wep-analysis`).
4. Drag and drop the `dist` folder into the upload box and click **Deploy Site**.
5. Your app is immediately live on the web!

---

### Option 3: Deploy via Wrangler CLI
```bash
npm install -g wrangler
wrangler pages deploy dist --project-name lncr-wep-analysis
```

---

## 💻 Local Development

### Quick Start (Windows)
Simply double-click:
```
start_or_reset.bat
```
This automatically syncs to your local drive (avoiding cloud storage file locks), installs dependencies, starts the Vite development server at `http://localhost:5173`, and opens your default browser.

### Manual Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle for Cloudflare Pages
npm run build

# Preview production build locally
npm run preview
```

---

## 📐 Combat Robotics Physics Reference

### 1. Moment of Inertia (MOI)
For any 3D body rotating about an axis specified by unit vector $\mathbf{u}$ and passing through a reference point $\mathbf{P}$:
$$I_{\text{axis}} = \mathbf{u}^T I_{\mathbf{C}} \mathbf{u} + M \cdot r_{\perp}^2$$
where:
- $I_{\mathbf{C}}$ is the $3 \times 3$ mass moment of inertia tensor centered at the body's Center of Mass $\mathbf{C}$.
- $M$ is the total weapon mass.
- $r_{\perp} = \|(\mathbf{C} - \mathbf{P}) \times \mathbf{u}\|$ is the perpendicular eccentricity from the axle to the Center of Mass.

### 2. Kinetic Energy
$$KE = \frac{1}{2} I_{\text{axis}} \omega^2$$
where $\omega = \frac{2 \pi \cdot \text{RPM}}{60}$ in $\text{rad/s}$.

### 3. Tip Speed
$$v_{\text{tip}} = \omega \cdot R_{\text{tip}}$$
where $R_{\text{tip}}$ is the maximum distance from the rotation axis to any cutting tooth tip.

### 4. Dynamic Unbalance Centrifugal Bearing Load
$$F_{\text{radial}} = M \cdot r_{\perp} \cdot \omega^2$$
Even 0.5 mm of static eccentricity at 10,000 RPM on a 1 lb weapon produces over **120 lbf** of destructive vibrating load on the weapon bearings!

---

## 🛠️ Tech Stack
- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 8
- **3D Graphics**: Three.js
- **CAD Engine**: OpenCASCADE Technology compiled to WebAssembly (`occt-import-js`)
- **Styling**: Tailwind CSS v4 + Lucide Icons
- **Deployment Target**: Cloudflare Pages / Static Jamstack

---

## 📝 License
MIT License. Built for the combat robotics community by **Late Night Combat Robotics**.
