const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.resolve(__dirname, '..', '..', 'LDFRS_Project_Functionalities_and_Code_Architecture_Guide.pdf');

console.log('Generating PDF to:', outputPath);

const doc = new PDFDocument({
  margin: 40,
  size: 'A4',
  bufferPages: true,
  info: {
    Title: 'LDFRS - Complete Project Functionalities and Code Architecture Guide',
    Author: 'LDFRS Engineering Team',
    Subject: 'Comprehensive Project Documentation and Code Directory Map'
  }
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

const primaryColor = '#14532d'; // Dark Forest Green
const secondaryColor = '#15803d'; // Green Accent
const darkTextColor = '#111827';
const mutedTextColor = '#4b5563';

function checkPageSpace(doc, neededPoints = 120) {
  if (doc.y + neededPoints > doc.page.height - 50) {
    doc.addPage();
  }
}

// Draw Header on first page
doc.rect(0, 0, doc.page.width, 105).fill(primaryColor);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('SAMRUDDHI / LDFRS', 40, 26);
doc.font('Helvetica').fontSize(11).text('Leaf Disease Detection & Fertilizer Recommendation System', 40, 54);
doc.fontSize(8.5).fillColor('#bbf7d0').text('Comprehensive System Functionalities & Code Directory Map | Official Architecture Guide', 40, 74);

doc.y = 125;

// Executive Summary
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(14).text('1. Platform Overview & Architectural Stack');
doc.moveDown(0.3);
doc.fillColor(darkTextColor).font('Helvetica').fontSize(9).lineGap(2.5).text(
  'LDFRS (Samruddhi) is an end-to-end precision agriculture intelligence platform designed to empower farmers with instant leaf disease diagnosis, real scientific fertilizer prescriptions, proactive meteorological spray scheduling, crop recovery time-lapses, nearby agri-cooperative maps, and agronomist expert second-opinions. The architecture is engineered to run seamlessly both online and 100% offline in rural field conditions.'
);
doc.moveDown(0.5);

// 3 Tier Architecture Box
const archBoxY = doc.y;
doc.rect(40, archBoxY, doc.page.width - 80, 56).fillAndStroke('#f0fdf4', '#bbf7d0');
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('Three-Tier Architectural Stack:', 50, archBoxY + 7);
doc.fillColor(darkTextColor).font('Helvetica').fontSize(8.5).lineGap(1.5).text(
  '• Frontend: Vite + React 19, React-Leaflet, React Router, Socket.io-client, CSS Custom Properties (Natural theme)\n' +
  '• Backend: Node.js (v24), Express 5, MongoDB / Mongoose, JWT, PDFKit, Socket.io, Axios, Multer\n' +
  '• ML Service: Python 3.11, FastAPI, PyTorch 2.14, Torchvision, PlantVillage 38-class Convolutional Neural Network',
  50, archBoxY + 22
);
doc.y = archBoxY + 68;

const modules = [
  {
    num: '2.1',
    title: 'AI Leaf Disease Detection & Uncertainty Gating',
    purpose: 'Deep learning computer vision system that classifies crop leaf diseases from photos, computes prediction confidence, and gates uncertainty.',
    features: [
      'Identifies 38 distinct crop disease classes across Tomato, Potato, Corn, Grape, Apple, Rice, Pepper, Peach, etc.',
      'Computes Softmax prediction confidence and Shannon entropy to detect model uncertainty.',
      'Automated Inference Gating: If confidence is < 70% or entropy is high, the scan is auto-enqueued to the Agronomist Expert Queue for second-opinion.',
      'Dual-mode inference: Prefers local offline FastAPI service (port 8001); falls back to cloud Render service or offline diagnostic engine.'
    ],
    codeFiles: [
      { layer: 'Frontend UI', path: 'frontend/src/components/ImageUpload.jsx' },
      { layer: 'Frontend View', path: 'frontend/src/components/PredictionResult.jsx' },
      { layer: 'Controller', path: 'backend/src/controllers/predictionController.js' },
      { layer: 'Inference Gate', path: 'backend/src/services/inferenceGate.js' },
      { layer: 'ML Service Adapter', path: 'backend/src/services/mlService.js' },
      { layer: 'ML Config & Failover', path: 'backend/src/config/mlConfig.js' },
      { layer: 'Model Definition', path: 'backend/src/models/Prediction.js' },
      { layer: 'FastAPI ML Service', path: 'ml-service/app.py' },
      { layer: 'PyTorch Inference Engine', path: 'ml-service/services/disease_prediction.py' },
      { layer: 'Trained Weights File', path: 'ml-service/models/disease_model.pth (16.5 MB)' }
    ]
  },
  {
    num: '2.2',
    title: 'Real-World Agronomic Fertilizer Prescriptions',
    purpose: 'Replaces generic disclaimers with certified, commercial agronomic fertilizer formulations, dosages, methods, and precautions specific to the detected pathogen.',
    features: [
      'Tailored Formulations: Recommends real products like Potassium Nitrate (13-0-45), SOP (0-0-50), MKP (0-52-34), Calcium Nitrate with Boron, and Zinc EDTA.',
      'Precise Dosages: Gives actionable per-liter and per-acre measures (e.g. 5g/L foliar spray; 5 kg/acre drip fertigation).',
      'Actionable Application Methods: Detailed leaf canopy spraying instructions and root zone drenching.',
      'Agronomic Scientific Reasons: Explains the biochemical recovery mechanism (e.g., Potassium thickens epidermal cell walls and stimulates phytoalexins).',
      'Nutritional Precautions: High-priority warnings (e.g., WITHHOLD high-nitrogen Urea during active blight to prevent succulent spore-incubating tissue).'
    ],
    codeFiles: [
      { layer: 'Prescription Engine', path: 'backend/src/services/fertilizerRecommendationService.js' },
      { layer: 'Disease Info Service', path: 'backend/src/services/diseaseInfoService.js' },
      { layer: 'Disease Knowledge Base', path: 'backend/src/data/diseaseInformation.js' },
      { layer: 'Frontend Result Card', path: 'frontend/src/components/PredictionResult.jsx' },
      { layer: 'PDF Report Sync', path: 'backend/src/services/reportService.js' }
    ]
  },
  {
    num: '2.3',
    title: 'Smart Spray Window & Farm Weather Advisor',
    purpose: 'Real-time meteorological spray decision engine that prevents chemical wash-off, spray drift, and foliage scorch using WeatherAPI satellite forecast data.',
    features: [
      'Live Suitability Index: Color-coded status (Optimal / Caution / Do Not Spray) based on real temperature, wind speed, gusts, and rain probability.',
      'Automated Best Window Calculation: Scans next 24 hours of hourly conditions and outputs the exact safest slot (e.g., Today 6:30 AM – 9:30 AM).',
      '4 Environmental Safety Factors: Rain wash-off risk (mm), Wind drift speed (km/h), Temperature foliage uptake (°C), and Leaf drying humidity (%).',
      '10-Hour Visual Timeline: Horizontal strip displaying upcoming hours with weather condition icons, temperatures, rain chances, and safety status dots.',
      'Offline Agronomic Baseline: Provides field-proven safe spray guidelines when no internet connection is available.'
    ],
    codeFiles: [
      { layer: 'Weather Forecast Service', path: 'backend/src/services/weatherService.js' },
      { layer: 'Weather Risk Controller', path: 'backend/src/controllers/weatherRiskController.js' },
      { layer: 'Weather Risk Routes', path: 'backend/src/routes/weatherRiskRoutes.js' },
      { layer: 'Disease Risk Rules', path: 'backend/src/data/diseaseWeatherRiskRules.js' },
      { layer: 'Frontend Spray Panel', path: 'frontend/src/components/WeatherRiskPanel.jsx' },
      { layer: 'Dashboard Integration', path: 'frontend/src/pages/Dashboard.jsx' }
    ]
  },
  {
    num: '2.4',
    title: 'Nearby Fertilizer Shops with Interactive Red Pin Map',
    purpose: 'Maps genuine regional fertilizer suppliers, Primary Agricultural Cooperative Societies (PACS), and Rythu Bharosa Kendras (RBK) around the farm on Leaflet.',
    features: [
      'Interactive Leaflet Map: Completely client-side rendered with custom red SVG pins for shops and blue pulse pin for the farmer location.',
      'Geodesic Projection: Places shops at authentic offsets (0.8 km, 1.6 km, etc.) from the farmer’s GPS coordinates.',
      'Interactive Pin Popups: Shows store name, distance, address, one-tap Call button, WhatsApp order link, and Google Maps Navigation link.',
      'Card & Map Sync: Clicking "Pin on Map" on any shop card smoothly flies the camera to that exact red marker and opens its popup.',
      'Reverse Geocoding: Automatically resolves the farmer’s town, mandal, district, and state via BigDataCloud & WeatherAPI.'
    ],
    codeFiles: [
      { layer: 'Shop Discovery Service', path: 'backend/src/services/shopService.js' },
      { layer: 'Shop Controller', path: 'backend/src/controllers/shopController.js' },
      { layer: 'Shop Routes', path: 'backend/src/routes/shopRoutes.js' },
      { layer: 'Frontend Map Component', path: 'frontend/src/components/NearbyShops.jsx' },
      { layer: 'Dashboard Geolocation', path: 'frontend/src/pages/Dashboard.jsx' }
    ]
  },
  {
    num: '2.5',
    title: 'Crop Recovery Tracker & Time-Lapse Healing',
    purpose: 'Tracks crop recovery progression over 7, 14, and 21 days with photo checkpoints, quantitative healing scores, and visual time-lapses.',
    features: [
      'Direct link from diagnosis into recovery journey with one click (Track Healing & Follow-up).',
      'Multi-stage checkpoints: Upload follow-up leaf images as treatment progresses.',
      'Side-by-side comparison slider: Visual comparison of original diseased leaf versus healed leaf.',
      'Quantitative progress metrics: Status badges (Recovering, Stabilized, Healed), recovery percentage bars, and expert verification.'
    ],
    codeFiles: [
      { layer: 'Database Model', path: 'backend/src/models/RecoveryTracker.js' },
      { layer: 'Controller', path: 'backend/src/controllers/recoveryController.js' },
      { layer: 'Routes', path: 'backend/src/routes/recoveryRoutes.js' },
      { layer: 'Frontend Page', path: 'frontend/src/pages/RecoveryTracker.jsx' },
      { layer: 'App Navigation Route', path: 'frontend/src/App.jsx (/recovery)' }
    ]
  },
  {
    num: '2.6',
    title: 'Agronomist Expert Review System & Annotation Canvas',
    purpose: 'Specialized workflow for agricultural researchers and extension officers to inspect, annotate, and verify low-confidence farmer scans.',
    features: [
      'Molecular Glassmorphic Theme: Distinct laboratory visual styling for agronomists.',
      'Triage Review Queue: Displays unconfirmed, high-entropy, or low-confidence farmer submissions.',
      'Interactive Annotation Canvas: Full-screen pan, zoom, and drawing tools allowing experts to draw bounding boxes and annotate fungal lesions directly on the leaf.',
      'Diagnosis Override & Advice: Experts update diagnosis, customize fertilizer dosage, and add tailored field instructions.',
      'Standalone MongoDB Sequential Fallback: Custom sequential atomic update mechanism eliminating replica set transaction errors on local machines.'
    ],
    codeFiles: [
      { layer: 'Review Controller', path: 'backend/src/controllers/reviewController.js' },
      { layer: 'Review Routes', path: 'backend/src/routes/reviewRoutes.js' },
      { layer: 'Diagnosis Review Model', path: 'backend/src/models/DiagnosisReview.js' },
      { layer: 'Expert Queue Page', path: 'frontend/src/pages/ExpertQueue.jsx' },
      { layer: 'Expert Review Canvas', path: 'frontend/src/pages/ExpertReview.jsx' },
      { layer: 'Farmer Status Badge', path: 'frontend/src/components/DiagnosisReviewStatus.jsx' }
    ]
  },
  {
    num: '2.7',
    title: 'Official PDF Advisory Report Generation & Delivery',
    purpose: 'Generates professional, printable diagnostic reports and dispatches them via WhatsApp, Telegram, and Email.',
    features: [
      'PDFKit Engine: Generates branded PDF reports containing farmer details, scan timestamp, high-res leaf image, disease severity, fertilizer formulation, dosage, and precautions.',
      'Twilio WhatsApp Dispatch: Sends automated diagnosis summaries and download links directly to the farmer’s WhatsApp phone number.',
      'Telegram Bot Alerts: Webhook-enabled real-time notification dispatch via Telegram.',
      'Direct Email Dispatch: Sends reports as PDF attachments via SMTP.'
    ],
    codeFiles: [
      { layer: 'PDF Report Generator', path: 'backend/src/services/reportService.js' },
      { layer: 'Delivery Controller', path: 'backend/src/controllers/notificationController.js' },
      { layer: 'Notification Service', path: 'backend/src/services/notificationService.js' },
      { layer: 'Delivery Modal UI', path: 'frontend/src/components/ReportDeliveryDialog.jsx' }
    ]
  },
  {
    num: '2.8',
    title: 'Community Disease Outbreak Map & Scan History',
    purpose: 'Aggregates anonymized regional diagnosis reports across districts to alert communities of spreading crop epidemics.',
    features: [
      'Regional Disease Heatmap: Visualizes active outbreaks by crop type and severity across geographic districts.',
      'Farmer Scan Archive: Searchable historical list of all past diagnoses with timestamps, crop tags, and direct PDF downloads.',
      'Privacy-Preserving Geolocation: Coordinates are rounded and anonymized to protect exact farm boundaries.'
    ],
    codeFiles: [
      { layer: 'History & Map Controller', path: 'backend/src/controllers/predictionController.js' },
      { layer: 'Frontend History Page', path: 'frontend/src/pages/History.jsx' },
      { layer: 'Community Leaflet Map', path: 'frontend/src/components/ScanMap.jsx' }
    ]
  },
  {
    num: '2.9',
    title: 'Government Agricultural Subsidies Finder',
    purpose: 'Curated directory connecting farmers with central and state agricultural welfare schemes, subsidized fertilizers, and equipment grants.',
    features: [
      'Searchable Scheme Database: Covers PM-KISAN, Soil Health Card Scheme, Sub-Mission on Agricultural Mechanization (SMAM), and Micro-Irrigation grants.',
      'Direct Application Links: Official state and national portal URLs with clear eligibility criteria.',
      'Subsidized Fertilizer Quotas: Guidance on availing subsidized Neem-Coated Urea and Nano-DAP allocations.'
    ],
    codeFiles: [
      { layer: 'Frontend Subsidies Page', path: 'frontend/src/pages/Subsidies.jsx' },
      { layer: 'App Navigation Route', path: 'frontend/src/App.jsx (/subsidies)' }
    ]
  },
  {
    num: '2.10',
    title: 'Multi-Language Accessibility (Indic / Bhashini)',
    purpose: 'Delivers full localization in regional Indian languages so rural farmers can navigate without language barriers.',
    features: [
      'Supported Languages: English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali.',
      'Dual Translation Engine: Integrates Bhashini pipeline URL with Google Translate & MyMemory fallback.',
      'Offline Graceful Fallback: If translation servers are unreachable, returns original text without crashing or throwing 502 errors.'
    ],
    codeFiles: [
      { layer: 'Translation Service', path: 'backend/src/services/translationService.js' },
      { layer: 'Translation Controller', path: 'backend/src/controllers/translationController.js' },
      { layer: 'Translation Routes', path: 'backend/src/routes/translationRoutes.js' },
      { layer: 'Language Selector UI', path: 'frontend/src/components/LanguageSelector.jsx' }
    ]
  },
  {
    num: '2.11',
    title: 'Security, Authentication & Role-Based Access Control',
    purpose: 'Secures platform resources and ensures role-appropriate workflows for Farmers, Agronomist Experts, and Admins.',
    features: [
      'Role-Based Authorization: Strict route guards for Farmer, Expert, and Admin accounts.',
      'Bcrypt Password Hashing & JWT: Secure salted password hashing and stateless token issuance.',
      'Google OAuth Integration: One-tap authentication via Google Identity Services.',
      'Persistent Offline Sessions: Cached in localStorage; network disconnects never wipe user sessions.'
    ],
    codeFiles: [
      { layer: 'User Model', path: 'backend/src/models/User.js' },
      { layer: 'Auth Controller', path: 'backend/src/controllers/authController.js' },
      { layer: 'Auth Routes', path: 'backend/src/routes/authRoutes.js' },
      { layer: 'JWT Middleware Guard', path: 'backend/src/middleware/authMiddleware.js' },
      { layer: 'Frontend Auth Context', path: 'frontend/src/context/AuthContext.jsx' },
      { layer: 'Login / Register Pages', path: 'frontend/src/pages/Login.jsx, Register.jsx' }
    ]
  },
  {
    num: '2.12',
    title: 'UI Architecture, Dual Themes & Symmetric Layout',
    purpose: 'Provides responsive, accessible, farmer-friendly design with specialized thematic modes.',
    features: [
      'Natural Agricultural Theme: Soft greens, earth tones, high-contrast readable typography, and crop emojis.',
      'Symmetric 50/50 Desktop Grid: Balanced 1:1 columns (repeat(2, minmax(0, 1fr))) and matching heights (min-height: 540px).',
      'Step-by-Step Stepper Banner: Visual progress tracker (1. Upload -> 2. AI Diagnosis -> 3. Nearby Shops on Maps).',
      'Expert Laboratory Theme: Molecular frosted glass overlay with backdrop-filter blur for researchers.'
    ],
    codeFiles: [
      { layer: 'Master Stylesheet', path: 'frontend/src/styles.css' },
      { layer: 'Main Dashboard Page', path: 'frontend/src/pages/Dashboard.jsx' },
      { layer: 'App Shell & Navigation', path: 'frontend/src/components/Navbar.jsx, Sidebar.jsx' }
    ]
  }
];

modules.forEach((mod) => {
  checkPageSpace(doc, 180);

  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text(`${mod.num} ${mod.title}`);
  doc.moveDown(0.2);

  doc.fillColor(mutedTextColor).font('Helvetica-Oblique').fontSize(8.5).text(`Purpose: ${mod.purpose}`);
  doc.moveDown(0.3);

  doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(8.5).text('Key Capabilities:');
  mod.features.forEach((feat) => {
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(8).lineGap(1).text(`  • ${feat}`, { indent: 10 });
  });
  doc.moveDown(0.4);

  doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5).text('Source Code Directories & File Paths:');
  const colWidth1 = 120;
  const colWidth2 = doc.page.width - 80 - colWidth1;

  mod.codeFiles.forEach((file, fIndex) => {
    checkPageSpace(doc, 20);
    const rowY = doc.y;
    const isEven = fIndex % 2 === 0;
    doc.rect(40, rowY - 1, doc.page.width - 80, 13).fill(isEven ? '#f9fafb' : '#ffffff');

    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(7.5).text(file.layer, 45, rowY + 1, { width: colWidth1 });
    doc.fillColor('#1f2937').font('Courier').fontSize(7.2).text(file.path, 45 + colWidth1, rowY + 1, { width: colWidth2 });
    doc.y = rowY + 14;
  });

  doc.moveDown(0.7);
});

// Summary Table of Directory Structure
checkPageSpace(doc, 200);
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(13).text('3. Repository Directory Structure Summary');
doc.moveDown(0.4);

const dirMap = [
  { dir: 'frontend/src/components/', desc: 'Reusable UI widgets: ImageUpload, PredictionResult, NearbyShops, WeatherRiskPanel, ScanMap' },
  { dir: 'frontend/src/pages/', desc: 'Route views: Dashboard, RecoveryTracker, ExpertQueue, ExpertReview, History, Subsidies, Login' },
  { dir: 'frontend/src/context/', desc: 'Global reactive state: AuthContext (persistent offline session management)' },
  { dir: 'frontend/src/styles.css', desc: 'Complete master CSS: natural agricultural theme, molecular expert theme, responsive grid' },
  { dir: 'backend/src/controllers/', desc: 'Express business logic: prediction, recovery, review, shop, weatherRisk, auth' },
  { dir: 'backend/src/services/', desc: 'Core engines: fertilizerRecommendation, weatherService, shopService, mlService, reportService' },
  { dir: 'backend/src/models/', desc: 'MongoDB schemas: User, Prediction, RecoveryTracker, DiagnosisReview' },
  { dir: 'backend/src/routes/', desc: 'REST API routing: predictionRoutes, recoveryRoutes, reviewRoutes, shopRoutes, weatherRiskRoutes' },
  { dir: 'backend/src/data/', desc: 'Agri knowledge base: diseaseInformation, diseaseWeatherRiskRules' },
  { dir: 'ml-service/', desc: 'FastAPI Python microservice, PyTorch model loader, disease_model.pth (38 classes)' }
];

dirMap.forEach((item, idx) => {
  const rY = doc.y;
  doc.rect(40, rY - 1, doc.page.width - 80, 15).fill(idx % 2 === 0 ? '#f0fdf4' : '#ffffff');
  doc.fillColor(primaryColor).font('Courier-Bold').fontSize(7.8).text(item.dir, 46, rY + 2, { width: 170 });
  doc.fillColor(darkTextColor).font('Helvetica').fontSize(7.8).text(item.desc, 220, rY + 2, { width: doc.page.width - 80 - 180 });
  doc.y = rY + 16;
});

// Footer with page numbering
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.rect(40, doc.page.height - 35, doc.page.width - 80, 0.5).fill('#e5e7eb');
  doc.fillColor('#9ca3af').font('Helvetica').fontSize(8).text(
    `SAMRUDDHI / LDFRS Project Architecture Guide  |  Page ${i + 1} of ${range.count}`,
    40,
    doc.page.height - 25,
    { align: 'center', width: doc.page.width - 80 }
  );
}

doc.end();

writeStream.on('finish', () => {
  console.log('PDF generation complete! Saved to:', outputPath);
});
