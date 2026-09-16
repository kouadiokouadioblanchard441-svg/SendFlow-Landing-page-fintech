const logoUrl = "/__mockup/images/sendflow-wordmark.png";

export function SendFlowNewsletter() {
  return (
    <div style={{ minHeight: "100vh", background: "#eef2f7", padding: "42px 20px", fontFamily: "Arial, Helvetica, sans-serif", color: "#192231" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 14, color: "#8290a3", fontSize: 10, letterSpacing: "0.16em", textAlign: "center", textTransform: "uppercase" as const }}>
          Aperçu du template newsletter
        </div>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "#ffffff", border: "1px solid #e0e7f0", borderRadius: 22, boxShadow: "0 20px 55px rgba(25,34,49,.12)", overflow: "hidden" }}>
          <tbody>
            <tr>
              <td style={{ padding: "25px 32px 20px", borderBottom: "1px solid #edf0f4", background: "#ffffff" }}>
                <img src={logoUrl} alt="SendFlow" width="176" style={{ display: "block", width: 176, height: "auto", border: 0 }} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: "30px 32px 8px" }}>
                <div style={{ color: "#6d35d8", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const }}>
                  Les nouvelles de SendFlow
                </div>
                <h1 style={{ margin: "12px 0 0", color: "#111827", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 38, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 1.04 }}>
                  L’argent circule.<br />
                  <em style={{ color: "#6d35d8" }}>Les réseaux aussi.</em>
                </h1>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "22px 32px 6px" }}>
                <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #5b21b6 0%, #1769ff 100%)", padding: "24px 25px", color: "#ffffff" }}>
                  <div style={{ marginBottom: 10, color: "#f8dd61", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
                    Une circulation plus simple
                  </div>
                  <div style={{ maxWidth: 430, fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
                    Un transfert peut être rapide, clair et accessible.
                  </div>
                  <p style={{ margin: "12px 0 0", color: "#eef3ff", fontSize: 14, lineHeight: 1.6 }}>
                    Découvrez les prochaines avancées de SendFlow pour simplifier les transferts entre réseaux en Afrique.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "22px 32px 8px" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                  Bonjour,
                </p>
                <p style={{ margin: "12px 0 0", color: "#4b5a6d", fontSize: 15, lineHeight: 1.75 }}>
                  Nous construisons SendFlow pour rendre les transferts plus simples, quel que soit le réseau utilisé. Voici un aperçu des nouvelles que nous partagerons avec vous.
                </p>
                <p style={{ margin: "14px 0 0", color: "#4b5a6d", fontSize: 15, lineHeight: 1.75 }}>
                  Pas de bruit, pas de messages inutiles : uniquement les avancées importantes du produit.
                </p>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 32px 30px" }}>
                <a href="#" style={{ display: "inline-block", borderRadius: 10, background: "#1769ff", padding: "13px 20px", color: "#ffffff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                  Découvrir SendFlow&nbsp; →
                </a>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "21px 32px 24px", borderTop: "1px solid #edf0f4", background: "#fbfcfe" }}>
                <p style={{ margin: 0, color: "#718096", fontSize: 12, lineHeight: 1.6 }}>
                  Vous recevez cet email parce que vous avez demandé les nouvelles de SendFlow.
                </p>
                <p style={{ margin: "8px 0 0", color: "#718096", fontSize: 12, lineHeight: 1.6 }}>
                  <a href="#" style={{ color: "#1769ff", textDecoration: "underline" }}>Se désabonner</a>
                  {" · "}
                  <a href="#" style={{ color: "#1769ff", textDecoration: "underline" }}>sendflow.studio</a>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ margin: "13px 0 0", color: "#94a1b2", fontSize: 10, textAlign: "center" }}>
          Le lien « Se désabonner » est ajouté automatiquement à chaque campagne.
        </p>
      </div>
    </div>
  );
}