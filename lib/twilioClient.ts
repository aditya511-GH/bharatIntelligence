import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function makeSchemeReminderCall(toPhone: string, schemeName: string, deadline: string): Promise<string> {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">
    Namaste! This is a reminder from India's National Ontology Platform.
    The deadline for the government scheme "${schemeName}" is approaching: ${deadline}.
    Please complete your application as soon as possible to avail this benefit.
    Visit myscheme dot gov dot in for more details. Thank you. Jai Hind.
  </Say>
</Response>`;

    const call = await client.calls.create({
        twiml,
        to: toPhone,
        from: process.env.TWILIO_PHONE_NUMBER!,
    });

    return call.sid;
}
