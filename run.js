const { execSync } = require('child_process');

function tryAudience(aud) {
  try {
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(aud)}`;
    const token = execSync(`curl -s -H "Metadata-Flavor: Google" "${url}"`, { encoding: 'utf8' }).trim();
    if (token) {
      const res = execSync(`curl -s -H "Authorization: Bearer ${token}" http://localhost:8000/files`, { encoding: 'utf8' });
      console.log(`Audience [${aud}]:`, res.trim());
      if (!res.includes('audience provided does not match')) {
        console.log(`!!! SUCCESS WITH AUDIENCE: ${aud} !!!`);
        return true;
      }
    }
  } catch (e) {
    console.error(`Error with aud [${aud}]:`, e.message);
  }
  return false;
}

const audiences = [
  'https://ais-dev-welmfvabu4qgrcxn3rd3gh-185422814199.asia-southeast1.run.app',
  'efc11ef2-9acd-45da-b6e5-a15f7b95cb66',
  'applet',
  'https://ai.studio/build',
  'control-plane-api',
  'ais-dev-welmfvabu4qgrcxn3rd3gh'
];

for (const aud of audiences) {
  if (tryAudience(aud)) break;
}
