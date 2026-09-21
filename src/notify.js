/**
 * Family notifications by SMS (Twilio REST, no SDK). When SMS is off or unconfigured the
 * notification is still recorded — marked simulated — so the app's "who's been notified"
 * list stays truthful about what actually went out.
 */
export function createNotifier(config, { fetchImpl = globalThis.fetch, log = console } = {}) {
  const { sms } = config;
  const live = sms.enabled && sms.accountSid && sms.authToken && sms.from;

  return {
    live: Boolean(live),
    async sendSms({ to, message }) {
      if (!live) return { channel: 'sms', status: 'simulated', simulated: true };
      if (!to) return { channel: 'sms', status: 'failed', error: 'no phone number', simulated: false };
      try {
        const body = new URLSearchParams({ To: to, From: sms.from, Body: message });
        const res = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sms.accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            authorization: `Basic ${Buffer.from(`${sms.accountSid}:${sms.authToken}`).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body,
        });
        if (!res.ok) throw new Error(`Twilio HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json();
        return { channel: 'sms', status: 'sent', sid: data.sid, simulated: false };
      } catch (err) {
        log.warn(`sms: ${err.message}`);
        return { channel: 'sms', status: 'failed', error: err.message, simulated: false };
      }
    },
  };
}
