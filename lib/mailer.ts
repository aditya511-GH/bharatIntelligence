import nodemailer from "nodemailer";

export interface ComplaintEmailPayload {
    complainantName: string;
    department: string;
    originalText: string;
    refinedText: string;
    gravity: string;
    problemType: string;
    imageAttachment?: { content: string; filename: string; contentType: string };
}

export async function sendComplaintEmail(payload: ComplaintEmailPayload): Promise<void> {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const gravityColors: Record<string, string> = {
        Critical: "#DC2626",
        High: "#EA580C",
        Medium: "#CA8A04",
        Low: "#16A34A",
    };
    const color = gravityColors[payload.gravity] ?? "#1565C0";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Citizen Complaint — ${payload.gravity} Priority</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#0D47A1,#00695C);padding:24px 32px;">
      <div style="color:#fff;font-size:13px;opacity:0.8;margin-bottom:4px;">NATIONAL ONTOLOGY ENGINE</div>
      <h1 style="color:#fff;margin:0;font-size:22px;">Citizen Complaint — AI Triaged</h1>
    </div>
    <div style="padding:24px 32px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding:12px 16px;background:#f9f9f9;border-radius:6px;border-left:4px solid ${color};">
        <div>
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Gravity Level</div>
          <div style="font-weight:700;font-size:18px;color:${color};">${payload.gravity}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Department</div>
          <div style="font-weight:600;font-size:15px;color:#333;">${payload.department}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Problem Type</div>
          <div style="font-weight:600;font-size:15px;color:#333;">${payload.problemType}</div>
        </div>
      </div>
      <h3 style="color:#0D47A1;border-bottom:1px solid #e0e0e0;padding-bottom:8px;">AI-Refined Complaint</h3>
      <p style="color:#333;line-height:1.7;">${payload.refinedText}</p>
      <h3 style="color:#666;margin-top:20px;border-bottom:1px solid #e0e0e0;padding-bottom:8px;">Original Submission</h3>
      <p style="color:#555;line-height:1.7;font-style:italic;">"${payload.originalText}"</p>
      <div style="margin-top:24px;padding:12px;background:#EDE7F6;border-radius:6px;font-size:12px;color:#555;">
        This complaint was automatically processed and routed by the National AI Ontology Engine. 
        Complainant: ${payload.complainantName} | Timestamp: ${new Date().toISOString()}
      </div>
    </div>
  </div>
</body>
</html>`;

    const attachments = payload.imageAttachment
        ? [
            {
                filename: payload.imageAttachment.filename,
                content: Buffer.from(payload.imageAttachment.content, "base64"),
                contentType: payload.imageAttachment.contentType,
            },
        ]
        : [];

    await transporter.sendMail({
        from: `"National Ontology Engine" <${process.env.SMTP_USER}>`,
        to: process.env.OFFICIALS_EMAIL ?? process.env.SMTP_USER,
        subject: `[${payload.gravity}] Citizen Complaint — ${payload.department}: ${payload.problemType}`,
        html,
        attachments,
    });
}
