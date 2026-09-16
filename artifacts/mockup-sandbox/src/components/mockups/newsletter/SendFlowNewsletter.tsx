const logoUrl = "/__mockup/images/sendflow-wordmark.png";

export function SendFlowNewsletter() {
  return (
    <div style={{ minHeight: "100vh", background: "#eeeeee", padding: "0 0 42px", fontFamily: "Arial, Helvetica, sans-serif", color: "#101010" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", background: "#ffffff", overflow: "hidden" }}>
        <div style={{ padding: "27px 19px 12px", background: "#ffffff" }}>
          <img src={logoUrl} alt="SendFlow" width="142" style={{ display: "block", width: 142, height: "auto", border: 0 }} />
        </div>
        <main style={{ padding: "8px 19px 34px", background: "#ffffff" }}>
          <h1 style={{ margin: "0 0 22px", color: "#090909", fontSize: 29, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.15 }}>
            SendFlow <span style={{ color: "#6d35d8" }}>Confirmation Email</span>
          </h1>
          <p style={{ margin: "0 0 19px", fontSize: 15, lineHeight: 1.45 }}>Dear User,</p>
          <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.42 }}>
            Thank you for joining SendFlow. Please click the link below to confirm your registration:
          </p>
          <p style={{ margin: "0 0 15px", fontSize: 15, lineHeight: 1.42 }}>
            <a href="#" style={{ color: "#4285f4", textDecoration: "none" }}>Confirm your registration</a>
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.42 }}>
            If you did not make this request, please ignore this email.
          </p>
          <p style={{ margin: "0 0 17px", fontSize: 15, lineHeight: 1.42 }}>Best regards,</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.42 }}>
            <span style={{ color: "#6d35d8", fontWeight: 700 }}>SendFlow</span> Team
          </p>
        </main>
        <footer style={{ padding: "18px 19px 22px", borderTop: "1px solid #eeeeee", background: "#ffffff" }}>
          <p style={{ margin: "0 0 9px", color: "#727272", fontSize: 11, lineHeight: 1.5 }}>
            Vous recevez cet email parce que vous avez demandé les nouvelles de SendFlow.
          </p>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
            <a href="#" style={{ color: "#4285f4", textDecoration: "none" }}>Se désabonner</a>
          </p>
        </footer>
      </div>
    </div>
  );
}