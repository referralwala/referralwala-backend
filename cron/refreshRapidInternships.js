// cron/refreshRapidInternships.js
const axios = require('axios');
const RapidInternship = require('../models/RapidInternship'); // Make sure this model exists

async function fetchData(start) {
  const options = {
    method: 'GET',
    url: 'https://linkedin-data-api.p.rapidapi.com/search-jobs-v2',
    params: {
      keywords: 'Internships',
      locationId: '102713980',
      datePosted: 'pastWeek',
      start: start.toString(),
      sort: 'mostRelevant',
    },
    headers: {
        'x-rapidapi-key': '6f8b59e1fcmsh453807decf6cf37p18580djsne726920872f3',
        'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.data ? response.data.data : []; 
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

const refreshRapidInternships = async () => {
  try {
    console.log(' Refreshing Rapid Internships');

    await RapidInternship.deleteMany({});
    console.log(' Deleted all RapidInternship entries');

    let start = 0;
    const limit = 4;
    let allInternships = [];

    for (let i = 0; i < limit; i++) {
      const internships = await fetchData(start);
      if (internships.length > 0) {
        allInternships = allInternships.concat(internships);
      }
      start += 50;
    }

    if (allInternships.length > 0) {
      await RapidInternship.insertMany(
        allInternships.map(internship => ({
          internshipId: internship.id,
          title: internship.title,
          url: internship.url,
          referenceId: internship.referenceId,
          posterId: internship.posterId,
          company: {
            name: internship.company?.name || 'N/A',
            logo: internship.company?.logo || 'N/A',
            url: internship.company?.url || 'N/A',
          },
          location: internship.location || 'N/A',
          type: internship.type || 'N/A',
          postDate: internship.postAt || 'N/A',
          benefits: internship.benefits || 'N/A',
        }))
      );
      console.log(`Inserted ${allInternships.length} new RapidInternships`);
    } else {
      console.log(' No internships fetched');
    }
  } catch (err) {
    console.error(' Cron error in refreshRapidInternships:', err.message);
  }
};

module.exports = refreshRapidInternships;
