const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const metascraper = require('metascraper')([
  require('metascraper-title')(),
  require('metascraper-description')(),
  require('metascraper-url')(),
  require('metascraper-date')()
]);

const router = express.Router();

const PATTERNS = {
  experience: [
    /(?:min(?:imum)?|required|relevant)?\s*(\d{1,2}\+?)\s*(years?|yrs?)\s*(of)?\s*(experience)?/i,
    /(\d{1,2}\+?)\s*(years?|yrs?)\s*(experience)?/i
  ],
  location: [
    /location[:\-]?\s*([A-Za-z ,]+(?:remote|on[-\s]?site|hybrid)?)/i,
    /(?:based in|work location)[:\-]?\s*([A-Za-z ,]+)/i
  ],
  workMode: {
    remote: /remote/i,
    hybrid: /hybrid/i,
    onsite: /on[-\s]?site|work from office/i
  },
  employmentType: {
    fullTime: /full[-\s]?time|permanent/i,
    partTime: /part[-\s]?time/i,
    internship: /intern((-|\s)?ship)?/i,
    contract: /contract|temporary/i
  },
  endDate: [
    /(?:last date|apply by|deadline|closing date)[:\-]?\s*([\w\s,]+(?:\d{4})?)/i
  ]
};

function findMatch(text, patterns) {
  if (!patterns) return null;
  if (Array.isArray(patterns)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
  } else if (typeof patterns === 'object') {
    for (const [key, regex] of Object.entries(patterns)) {
      if (regex.test(text)) return key;
    }
  } else {
    const match = text.match(patterns);
    if (match) return match[1] || match[0];
  }
  return null;
}

async function extractJobDetails(url) {
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const metadata = await metascraper({ html, url });
  const $ = cheerio.load(html);

  const bodyText = $('body').text();

  let jobId = null;
  try {
    const parsedUrl = new URL(url);
    jobId = parsedUrl.searchParams.get('jobId') || parsedUrl.pathname.split('/').find(part => /^\d+$/.test(part)) || 'Not found';
  } catch {
    jobId = 'Not found';
  }

  const title = (metadata.title || $('h1').first().text() || '').trim();
  const description = (metadata.description || $('p').first().text() || '').trim();

  const experience = findMatch(bodyText, PATTERNS.experience) || 'Not specified';

  let location = $('[class*=location], [data-location]').first().text().trim();
  if (!location) location = findMatch(bodyText, PATTERNS.location) || 'Not found';

  let workMode = 'Not specified';
  for (const mode in PATTERNS.workMode) {
    if (PATTERNS.workMode[mode].test(bodyText)) {
      workMode = mode.charAt(0).toUpperCase() + mode.slice(1);
      break;
    }
  }

  let employmentType = 'Not specified';
  for (const type in PATTERNS.employmentType) {
    if (PATTERNS.employmentType[type].test(bodyText)) {
      employmentType = type.charAt(0).toUpperCase() + type.slice(1);
      break;
    }
  }

  const endDate = metadata.date || findMatch(bodyText, PATTERNS.endDate) || 'Not found';

  return {
    "jobRole": title,
    "jobLink": url,
    "jobUniqueId": jobId,
    "experienceRequired": experience.trim(),
    "location": location,
    "workMode": workMode,
    "employmentType": employmentType,
    "endDate": endDate,
    "jobDescription": description
  };
}

router.post('/extract-job', async (req, res) => {
  const { jobUrl } = req.body;

  if (!jobUrl) {
    return res.status(400).json({ error: 'jobUrl is required in request body' });
  }

  try {
    const jobDetails = await extractJobDetails(jobUrl);
    return res.json(jobDetails);
  } catch (error) {
    console.error('Error extracting job details:', error);
    return res.status(500).json({ error: 'Failed to extract job details' });
  }
});

module.exports = router;
