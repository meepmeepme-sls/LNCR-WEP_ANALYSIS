# LNCR-WEP_ANALYSIS ⚡
### Combat Robotics Weapon MOI, Tip Speed & Dynamics Analyzer
*Developed for Late Night Combat Robotics · Engineered for BattleBots, NHRL & Robot Combat Builders*

[![GitHub Repository](https://img.shields.io/badge/GitHub-meepmeepme--sls%2FLNCR--WEP__ANALYSIS-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/meepmeepme-sls/LNCR-WEP_ANALYSIS)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge)](LICENSE)
[![Built with React](https://img.shields.io/badge/Built%20with-React%2019%20%2B%20Three.js-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)

A modern, responsive, 100% free-to-host web application designed for combat robotics engineers to upload `.step` or `.stp` CAD models of spinning blades, beater bars, or drums, preview the weapon with its rotation axis, specify materials, and calculate exact Moment of Inertia (MOI), Tip Speed, Stored Kinetic Energy, dynamic balance, and electrical powertrain drive ratios.

---

## 🚀 Key Features

- **Browser-Side STEP File Parsing**:
  - Drag & drop or upload `.step` / `.stp` files directly in your web browser.
  - Powered by **OpenCASCADE WebAssembly (WASM)** (`occt-import-js`) offloaded to a Web Worker — runs 100% locally on your machine with zero server costs, zero upload delays, and complete CAD privacy.

- **Exact Mass & MOI Integration**:
  - Implements the exact **Divergence Theorem** (polyhedral tetrahedral boundary integration) over triangular faces.
  - Computes exact Volume ($V$), Total Mass ($M$), Center of Mass ($\mathbf{C}$), and the full $3 \times 3$ Mass Moment of Inertia Tensor ($I_{xx}, I_{yy}, I_{zz}, I_{xy}, I_{yz}, I_{zx}$).
  - Computes exact MOI around any arbitrary rotation axis using the generalized parallel axis theorem:
    $$I_{\text{axis}} = \mathbf{u}^T I_{\mathbf{C}} \mathbf{u} + M \cdot r_{\perp}^2$$
  - Instant unit switching: $\text{lb}\cdot\text{in}^2$, $\text{oz}\cdot\text{in}^2$, $\text{kg}\cdot\text{m}^2$ (SI), $\text{g}\cdot\text{cm}^2$, and $\text{lb}\cdot\text{ft}^2$ with 1-click clipboard copy.

- **Interactive 3D Viewport**:
  - High-performance Three.js renderer with realistic metallic PBR materials and hemisphere lighting.
  - **Center of Mass (COM) Rotation Pivot**: The weapon rotates directly around its true Center of Mass or selected shaft centerline.
  - **Rotation Direction & Controls**: Invert rotation direction (CW / CCW) on the fly with a single click.
  - **Rotation Axle Visualizer**: Glowing cyan axle rod with reference line and bearing collars.
  - **Live 3D Spinning Animation**: Watch your weapon spin around its configured axis with play/pause and visual speed controls.
  - **Center of Mass (COM) Target**: Neon green marker with coordinates tooltip.
  - **Tip Sweep Perimeter**: Cutting circle indicating the outer sweep radius of the teeth.
  - **Static Imbalance Warning Line**: If the weapon is eccentric, a bright red indicator shows the offset distance between the COM and the rotation axle.
  - **Pick Axle Point Tool**: Click directly on any surface or bore hole in the 3D model to relocate the axle origin.
  - Preset camera angles (ISO, Top, Front, Right) and PNG screenshot capture.

- **Combat Robotics Materials**:
  - **Steel** ($7.85 \text{ g/cm}^3$ / $0.2836 \text{ lb/in}^3$): AR400/500 armor steel, S7 shock tool steel, 4140 chromoly, mild steel.
  - **Aluminum 6000 Series Alloy** ($2.70 \text{ g/cm}^3$ / $0.0975 \text{ lb/in}^3$): Structural 6061-T6 aluminum for weapon hubs, pulleys, and beaters.
  - **GR5 Titanium** ($4.43 \text{ g/cm}^3$ / $0.1600 \text{ lb/in}^3$): Grade 5 Titanium (Ti-6Al-4V) for high strength-to-weight applications.

- **Dual-Mode Speed & Powertrain Calculator**:
  - **Direct RPM Mode**: Slider and numerical entry up to 40,000 RPM with quick presets (5k, 8k, 10k, 12k, 16k).
  - **Powertrain Calculator Mode**:
    - **Battery Voltage**: Selectable from **2S to 16S** ($7.4\text{V}$ to $59.2\text{V}$) with a toggle for **Nominal (3.7V)** vs. **Full Charge (4.2V)**.
    - **Motor KV Field**: Direct numeric input with presets (1400kv, 1800kv, 2200kv, 2700kv, 3500kv).
    - **External Reduction Ratio**: Dedicated **Driver** and **Driven** input fields with decimal support (e.g. 14.5 driver to 60.2 driven), automatically computing ratio ($\text{Driven}/\text{Driver}$) and resulting weapon RPM.

- **Combat Robotics Dynamics Telemetry**:
  - **Stored Kinetic Energy ($KE = \frac{1}{2} I \omega^2$)**: Real-time display in Joules ($\text{J}$) and Foot-Pounds ($\text{ft}\cdot\text{lbf}$) with weight class benchmark scales (Fairyweight to Heavyweight).
  - **Tip Speed ($v = \omega R_{\text{tip}}$)**: Display in $\text{mph}$ and $\text{m/s}$ with **BattleBots 250 mph rule checker** alert.
  - **Static & Dynamic Balance Check**: Calculates static eccentricity ($e$) and bearing centrifugal force ($F = M \cdot e \cdot \omega^2$ in lbf and Newtons) to predict vibration and gyro instability.

- **User Interface**:
  - **Results Tab**: Comprehensive MOI, Tip Speed, Kinetic Energy, and Dynamic Balance dashboard.
  - **Setup Tab (Minimizable Window)**: Quick collapse/expand window for rotation axis and material selection.
  - **Site-Wide Light / Dark Mode**: Default crisp light mode with instant theme switcher in the footer.

- **Pre-Loaded Default Blades Library (20 1lb Antweight Weapons)**:
  - **Antweight Compact (2.50″ to 3.75″)**: 2.50″ Type 1 & 2, 2.75″ Symmetric (`2.75Sym`), 2.75″ Single-Tooth (`2.75Bar`), 2.75″ High-MOI (`2.75MOI`), 2.75″ Type 1, 3.00″ Type 1 & 2, 3.25″ Type 1, 3.50″ Type 1, 3.75″ Type 1.
  - **Antweight Long-Reach (4.00″ to 6.00″)**: 4.00″ Type 1, 4.25″ Type 1, 4.50″ Type 1, 4.75″ Type 1, 5.00″ Type 1, 5.25″ Type 1, 5.50″ Type 1, 6.00″ Type 1 & 2.

---

## 🌐 How to Host for FREE on Cloudflare Pages

Because **LNCR-WEP_ANALYSIS** is built as a pure client-side static Single Page Application (SPA) using WebAssembly, it requires **zero backend servers or databases**. You can host it 100% free forever on **Cloudflare Pages** with unlimited bandwidth, global SSL, and lightning-fast edge CDN caching.

### Option 1: GitHub Integration (Recommended)
1. Fork or push to GitHub:
   ```bash
   git remote add origin https://github.com/meepmeepme-sls/LNCR-WEP_ANALYSIS.git
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
