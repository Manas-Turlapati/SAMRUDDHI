import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <div className="public-page">
      <Navbar />
      <main>
        <section className="hero-section">
          <div className="hero-content">
            <span className="eyebrow">Agricultural AI decision support</span>
            <h1>SAMRUDDHI</h1>
            <p>
              Sustainable Agriculture Model for Resource Utilisation, Disease Diagnostics, & Health Initiative.
              Detect visible crop disease from a leaf image and receive targeted fertilizer guidance through one secure
              web application.
            </p>
            <div className="hero-actions">
              <Link to="/dashboard" className="primary-button">
                Detect Disease
              </Link>
              <Link to="/register" className="secondary-button">
                Get Started
              </Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="leaf-panel">
              <span className="scan-line" />
              <div className="leaf-shape" />
              <div className="signal-card top">Disease: Early Blight</div>
              <div className="signal-card bottom">Recommendation ready</div>
            </div>
          </div>
        </section>

        <section className="features-section">
          {[
            ["Secure account access", "JWT-protected workflows keep scans tied to each authenticated user."],
            ["Image-based diagnosis", "Upload JPG or PNG leaf photos and send them through the Express backend."],
            ["Actionable nutrition", "Get fertilizer, dosage, method, and frequency in a clear recommendation card."],
          ].map(([title, text]) => (
            <article className="feature-card" key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="how-section">
          <div className="section-heading">
            <span className="eyebrow">How it works</span>
            <h2>From leaf image to field action</h2>
          </div>
          <div className="steps">
            {[
              ["1", "Create an account", "Register or sign in to unlock protected prediction tools."],
              ["2", "Upload a leaf", "Drag and drop a clear crop image into the dashboard scanner."],
              ["3", "Review guidance", "Use the disease confidence and fertilizer plan to guide next steps."],
            ].map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="footer">
        SAMRUDDHI - Sustainable Agriculture Model for Resource Utilisation, Disease Diagnostics, & Health Initiative
      </footer>
    </div>
  );
}
