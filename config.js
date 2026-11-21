/* StudyForge 2.0 R1: standaard volledig lokaal, zonder database.
   Alleen expliciete herstelmodus haalt historische gegevens uit de oude cloud.
   De sleutel hieronder is een openbare Supabase publishable key, geen geheim. */
const SF_LEGACY_CLOUD = new URLSearchParams(window.location.search).get('legacy-cloud') === '1';
window.STUDYFORGE_SUPABASE = SF_LEGACY_CLOUD ? {
  url: 'https://vjqgodidvpkybeoectxu.supabase.co',
  publishableKey: 'sb_publishable_wazrGrYlvv0ANucwPL_KeA_yTwrQd8y',
  sharedMode: true
} : {};
window.STUDYFORGE_LEGACY_CLOUD = SF_LEGACY_CLOUD;
