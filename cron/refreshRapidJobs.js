// cron/refreshRapidJobs.js

const cron = require('node-cron');
const axios = require('axios');
const RapidJob = require('../models/RapidJob'); 

// Reuse your fetchData function
const fetchData = async (start) => {
  const options = {
    method: 'GET',
    url: 'https://linkedin-api8.p.rapidapi.com/search-jobs-v2',
    params: {
      keywords: 'Software Developers',
      locationId: '102713980',
      datePosted: 'pastWeek',
      start: start.toString(),
      sort: 'mostRelevant',
    },
    headers: {
      'x-rapidapi-key': '6f8b59e1fcmsh453807decf6cf37p18580djsne726920872f3',
      'x-rapidapi-host': 'linkedin-api8.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.data ? response.data.data : [];
  } catch (error) {
    console.error(' Error fetching data:', error);
    return [];
  }
};

const refreshRapidJobs = async () => {
    try {
      console.log(' Refreshing Rapid Jobs');
  
      await RapidJob.deleteMany({});
      console.log(' Deleted all RapidJob entries');
  
      let start = 0;
      const limit = 4;
      let allRapidJobs = [];
  
      for (let i = 0; i < limit; i++) {
        const jobs = await fetchData(start);
        if (jobs.length) allRapidJobs = allRapidJobs.concat(jobs);
        start += 50;
      }
  
      if (allRapidJobs.length > 0) {
        await RapidJob.insertMany(
          allRapidJobs.map(job => ({
            jobId: job.id,
            title: job.title,
            url: job.url,
            referenceId: job.referenceId,
            posterId: job.posterId,
            company: {
              name: job.company?.name || 'N/A',
              logo: job.company?.logo || 'N/A',
              url: job.company?.url || 'N/A',
            },
            location: job.location || 'N/A',
            type: job.type || 'N/A',
            postDate: job.postAt || 'N/A',
            benefits: job.benefits || 'N/A',
          }))
        );
        console.log(` Inserted ${allRapidJobs.length} new RapidJobs`);
      } else {
        console.log(' No jobs fetched');
      }
    } catch (err) {
      console.error(' Cron error in refreshRapidJobs:', err.message);
    }
  };
  
  module.exports = refreshRapidJobs;
