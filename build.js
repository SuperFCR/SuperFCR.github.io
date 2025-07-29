const fs = require('fs');
const path = require('path');

function build() {
    try {
        // 读取数据文件
        const dataPath = path.join(__dirname, 'config', 'data.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // 直接用JavaScript生成HTML，避免复杂的模板解析
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="description" content="${data.personal.name}'s homepage">
    <title>${data.personal.name}'s Homepage</title>
    <link rel="icon" media="(prefers-color-scheme:dark)" href="./assets/imgs/favicon-dark.png" type="image/png" />
    <link rel="icon" media="(prefers-color-scheme:light)" href="./assets/imgs/favicon.png" type="image/png" />
    <link href="./assets/css/profile.css" rel="stylesheet" type="text/css">
    <meta name="GENERATOR" content="MSHTML 11.00.10570.1001">
</head>

<body> 
  <div id="layout-content" style="margin-top: 25px;">
  <table>
    <tbody>
    <tr>
      <td width="670">
        <div id="toptitle">
        <h1>${data.personal.name}</h1></div>
        <h3><span class="emoji">🎓</span> ${data.personal.title}</h3>
        <p><a href="https://www.ece.pku.edu.cn/">${data.personal.school}</a>
        <br>${data.personal.university},
        <br>${data.personal.location}
        <br>
        
        <div class="contact-box">
            <img src="./assets/imgs/envelope.png" alt="Email">
            <a href="mailto:${data.personal.email}">${data.personal.email}</a>

            <img src="./assets/imgs/google.png" alt="Google Scholar">
            <a href="${data.personal.googleScholar}" target="_blank">Google Scholar</a>

            <img src="./assets/imgs/github.png" alt="GitHub">
            <a href="${data.personal.github}" target="_blank">GitHub</a>
        </div>
        </p>
      </td>

      <td>
        <div>
            <img class="profile-pic" src="${data.personal.profileImage}" alt="Profile Picture">
        </div>
      </td>
    </tr>
    <tr></tr></tbody>
  </table>
  <div id="layout-content" style="margin-top: 25px;">

<h2>Education</h2>
  <ul>
    ${data.education.map(edu => `
    <li>
      ${edu.period} ${edu.emoji || ''} ${edu.description}
    </li>`).join('')}
  </ul>
    
<h2>Biography</h2>
  <p>${data.biography}</p>

<h2>News</h2>
<ul>
  ${data.news.map(news => `
  <li>
    ${news.date} ${news.emoji || ''} ${news.content}
  </li>`).join('')}
</ul>

<h2>Selected Projects</h2>
* Equal Contribution &nbsp;&nbsp # Project Lead
<br><br><tr><td><b><font color="#001F3F">&spades; 3D Reconstruction & Generative Model </font></b></td></tr>
<ul class="pub-list">
    ${data.projects['3d_reconstruction'].map(project => `
    <li>
        <div class="publication-entry">
            <img src="${project.image}" alt="${project.title}">
            <div>
                <b>${project.title}</b><br>
                <span style="color: #777;">${project.authors}</span><br>
                <i style="color: #b70505c0;">${project.description}</i><br>
                <i><b>${project.venue}</b></i> &nbsp; 
                ${project.links.map(link => `[<a href="${link.url}">${link.type}</a>]`).join(' ')}
            </div>
        </div>
    </li>`).join('')}
</ul>

<br>
<tr><td><b><font color="#001F3F">&spades; Neuromorphic Vision </font></b></td></tr>
<ul class="pub-list">
  ${data.projects.neuromorphic_vision.map(project => `
  <li>
    <div class="publication-entry">
      <img src="${project.image}" alt="${project.title}">
      <div>
        <b>${project.title}</b><br>
        <span style="color: #777;">${project.authors}</span><br>
        <i style="color: #b70505c0;">${project.description}</i><br>
        <i><b>${project.venue}</b></i> &nbsp;
        ${project.links.map(link => `[<a href="${link.url}">${link.type}</a>]`).join(' ')}
      </div>
    </div>
  </li>`).join('')}
</ul>

<h2>Award</h2>
<ul>
  ${data.awards.map(award => `
  <li>
    ${award.date}${award.emoji || ''} ${award.content}
  </li>`).join('')}
</ul>

<h2>Professional Activities </h2>
<ul>
  <li>
  Conference Reviewer: ${data.activities.conference_reviewer}; 
  </li>
  <li>
  Jounal Reviewer: ${data.activities.journal_reviewer}; 
  </li>
</ul>

<a href="https://clustrmaps.com/site/1c5bo"  title="Visit tracker">
  <img src="//www.clustrmaps.com/map_v2.png?d=BRf4_qJelQm7X4ukCxJuzTHr88doqXYrA5-S7H0IEWA&cl=ffffff" />
</a>

</body>
</div>
</div>
</body>
</html>`;

        // 写入输出文件
        const outputPath = path.join(__dirname, 'index.html');
        fs.writeFileSync(outputPath, html, 'utf8');

        console.log('✅ Homepage generated successfully!');
        console.log(`📄 Output: ${outputPath}`);
        
        // 显示一些统计信息
        console.log(`📊 Statistics:`);
        console.log(`   - Education entries: ${data.education?.length || 0}`);
        console.log(`   - News entries: ${data.news?.length || 0}`);
        console.log(`   - 3D projects: ${data.projects?.['3d_reconstruction']?.length || 0}`);
        console.log(`   - Neuromorphic projects: ${data.projects?.neuromorphic_vision?.length || 0}`);
        console.log(`   - Awards: ${data.awards?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Error building homepage:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    build();
}

module.exports = { build };