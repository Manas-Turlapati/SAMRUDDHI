import { useMemo, useState } from "react";

const subsidyCategories = ["All", "Income", "Insurance", "Credit", "Energy", "Soil", "Equipment", "Infrastructure"];

const subsidies = [
  {
    name: "PM-KISAN Samman Nidhi",
    category: "Income",
    benefit: "Direct income support of Rs. 6,000 per year in three instalments for eligible farmer families.",
    eligibility: "Eligible landholding farmer families, subject to government exclusion rules.",
    documents: ["Aadhaar", "bank account", "land record", "mobile number"],
    apply: "https://pmkisan.gov.in/",
    source: "PM-KISAN Portal",
    bestFor: "Small and marginal farmers who need regular input support.",
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana",
    category: "Insurance",
    benefit: "Crop insurance support against notified risks such as drought, flood, pests, disease, and yield loss.",
    eligibility: "Farmers growing notified crops in notified areas during the active season.",
    documents: ["land record or tenancy proof", "bank account", "sowing certificate", "Aadhaar"],
    apply: "https://pmfby.gov.in/",
    source: "PMFBY Portal",
    bestFor: "Farmers who want protection from weather and disease-linked crop losses.",
  },
  {
    name: "Kisan Credit Card",
    category: "Credit",
    benefit: "Short-term crop and allied activity credit through banks with interest support for eligible farmers.",
    eligibility: "Cultivators, tenant farmers, sharecroppers, oral lessees, SHGs, and JLGs as per bank norms.",
    documents: ["identity proof", "address proof", "land or cultivation proof", "bank details"],
    apply: "https://www.myscheme.gov.in/schemes/kcc",
    source: "myScheme",
    bestFor: "Farmers who need working capital for seeds, fertilizer, pesticides, and allied needs.",
  },
  {
    name: "PM-KUSUM",
    category: "Energy",
    benefit: "Subsidy support for standalone solar pumps and solarisation of existing grid-connected agriculture pumps.",
    eligibility: "Farmers applying through their state implementing agency and approved vendors.",
    documents: ["Aadhaar", "land record", "electricity connection details if applicable", "bank account"],
    apply: "https://pmkusum.mnre.gov.in/landing.html",
    source: "PM-KUSUM Portal",
    bestFor: "Farmers spending heavily on diesel or unreliable irrigation power.",
  },
  {
    name: "Soil Health Card Scheme",
    category: "Soil",
    benefit: "Soil nutrient testing and crop-wise fertilizer recommendations to improve input efficiency.",
    eligibility: "Farmers whose soil samples are collected under state agriculture department drives.",
    documents: ["farm location details", "farmer identity details", "mobile number"],
    apply: "https://soilhealth.dac.gov.in/",
    source: "Soil Health Card Portal",
    bestFor: "Farmers who want to reduce unnecessary fertilizer use and improve soil quality.",
  },
  {
    name: "Namo Drone Didi",
    category: "Equipment",
    benefit: "Central financial assistance for Women SHGs to provide drone rental services for agriculture operations.",
    eligibility: "Women Self Help Groups selected under the scheme through implementing agencies.",
    documents: ["SHG registration", "member identity details", "bank account", "training records if applicable"],
    apply: "https://www.myscheme.gov.in/",
    source: "myScheme",
    bestFor: "Women SHGs planning fertilizer and pesticide spraying as a local service.",
  },
  {
    name: "Agriculture Infrastructure Fund",
    category: "Infrastructure",
    benefit: "Financing support for post-harvest management and community farming infrastructure projects.",
    eligibility: "Farmers, FPOs, PACS, SHGs, startups, agri-entrepreneurs, and other eligible entities.",
    documents: ["project report", "identity proof", "bank details", "entity registration if applicable"],
    apply: "https://agriinfra.dac.gov.in/",
    source: "AIF Portal",
    bestFor: "Storage, sorting, grading, processing, and market-linkage infrastructure.",
  },
];

export default function Subsidies() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filteredSubsidies = useMemo(() => {
    const search = query.trim().toLowerCase();

    return subsidies.filter((subsidy) => {
      const matchesCategory = category === "All" || subsidy.category === category;
      const searchableText = [
        subsidy.name,
        subsidy.category,
        subsidy.benefit,
        subsidy.eligibility,
        subsidy.bestFor,
        subsidy.documents.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!search || searchableText.includes(search));
    });
  }, [category, query]);

  return (
    <div className="page-content subsidies-page">
      <section className="page-header subsidies-header">
        <div>
          <span className="eyebrow">Subsidies</span>
          <h1>Government support for farmers</h1>
          <p>
            Explore major India government schemes, check basic fit, and open the official portal before applying.
          </p>
        </div>
        <div className="subsidy-summary" aria-label="Subsidy feature summary">
          <strong>{subsidies.length}</strong>
          <span>schemes tracked</span>
        </div>
      </section>

      <section className="subsidy-advisor">
        <div>
          <h2>Is this a good novelty?</h2>
          <p>
            Yes. For SAMRUDDHI, subsidies are a strong novelty because disease detection tells farmers what is wrong,
            while subsidy discovery helps them afford the next action.
          </p>
        </div>
        <div>
          <span>Best extension</span>
          <strong>Link future recommendations to matching schemes by crop, state, and farmer profile.</strong>
        </div>
      </section>

      <section className="subsidy-tools" aria-label="Find subsidies">
        <label>
          Search schemes
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try solar pump, insurance, soil, credit"
          />
        </label>
        <div className="subsidy-tabs" role="tablist" aria-label="Subsidy categories">
          {subsidyCategories.map((item) => (
            <button
              key={item}
              type="button"
              className={item === category ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="subsidy-grid" aria-label="Available subsidies">
        {filteredSubsidies.map((subsidy) => (
          <article className="subsidy-card" key={subsidy.name}>
            <div className="subsidy-card-header">
              <span>{subsidy.category}</span>
              <small>{subsidy.source}</small>
            </div>
            <h2>{subsidy.name}</h2>
            <p>{subsidy.benefit}</p>

            <dl>
              <div>
                <dt>Good fit for</dt>
                <dd>{subsidy.bestFor}</dd>
              </div>
              <div>
                <dt>Basic eligibility</dt>
                <dd>{subsidy.eligibility}</dd>
              </div>
              <div>
                <dt>Common documents</dt>
                <dd>{subsidy.documents.join(", ")}</dd>
              </div>
            </dl>

            <a className="primary-button subsidy-link" href={subsidy.apply} target="_blank" rel="noreferrer">
              Open official portal
            </a>
          </article>
        ))}
      </section>

      {filteredSubsidies.length === 0 && (
        <section className="empty-state">
          <h2>No matching subsidies found</h2>
          <p>Try a broader keyword or switch the category back to All.</p>
        </section>
      )}

      <section className="subsidy-note">
        <strong>Farmer note:</strong>
        <span>
          Benefits, deadlines, state participation, and document rules can change. Always verify details on the official
          portal or with the local agriculture office before applying.
        </span>
      </section>
    </div>
  );
}
