# Falcary's Homepage Template Generator

A template-based personal homepage generation system that allows you to quickly update website content by modifying configuration files.

## 🚀 Features

- **Data-driven**: Separate content from presentation logic
- **Easy maintenance**: Update content by editing JSON configuration
- **Automatic generation**: One command to rebuild your entire homepage
- **Responsive design**: Clean and professional layout
- **Customizable**: Easy to modify styles and structure

## 📁 Project Structure

```
homepage/
├── config/
│   └── data.json           # Data configuration file
├── templates/
│   └── index.html          # HTML template (deprecated - now using JS generation)
├── assets/
│   ├── css/
│   │   └── profile.css     # Stylesheet
│   └── imgs/               # Image assets
├── build.js                # Build script
├── package.json            # Project configuration
├── README.md               # Documentation
└── index.html              # Generated final homepage
```

## 🛠️ Setup & Usage

### 1. Install Dependencies (Optional)
```bash
npm install
```

### 2. Configure Your Data
Edit the `config/data.json` file with your personal information, projects, awards, etc.

### 3. Generate Website
```bash
npm run build
# or run directly
node build.js
```

### 4. View Results
Open the generated `index.html` file in your browser.

## 📝 Configuration Guide

### Personal Information (`personal`)
```json
{
  "personal": {
    "name": "Your Name",
    "title": "Your Title/Position",
    "school": "Your School/Department",
    "university": "Your University",
    "location": "Your Location",
    "email": "your.email@example.com",
    "profileImage": "./assets/imgs/your-photo.jpg",
    "googleScholar": "https://scholar.google.com/citations?user=YOUR_ID",
    "github": "https://github.com/yourusername"
  }
}
```

### Education (`education`)
Array format, each entry contains:
- `period`: Time period (e.g., "[2020-2024]")
- `emoji`: Emoji symbol (optional)
- `description`: Detailed description with HTML support

### Projects (`projects`)
Organized into two categories:
- `3d_reconstruction`: 3D reconstruction related projects
- `neuromorphic_vision`: Neuromorphic vision projects

Each project contains:
- `title`: Project title with emoji
- `authors`: Author list (HTML supported for formatting)
- `description`: Project description
- `venue`: Publication venue
- `image`: Project image path
- `links`: Array of related links with `type` and `url`

### News (`news`)
Array format, each entry contains:
- `date`: Date (e.g., "[2025-07]")
- `emoji`: Emoji symbol (optional)
- `content`: News content with HTML support

### Awards (`awards`)
Array format, each entry contains:
- `date`: Date
- `emoji`: Emoji symbol (optional)
- `content`: Award content

### Professional Activities (`activities`)
- `conference_reviewer`: Conference reviewing activities
- `journal_reviewer`: Journal reviewing activities

## 🎨 Customization

### Modifying Styles
Edit `assets/css/profile.css` to customize the website appearance:

- **Colors**: Modify color schemes
- **Layout**: Adjust spacing, margins, and positioning
- **Typography**: Change fonts and text styles
- **Responsive design**: Add mobile-friendly styles

### Adding New Sections
1. Add new data to `config/data.json`
2. Modify `build.js` to include the new section in HTML generation
3. Add corresponding CSS styles if needed

## 🔧 Build Script Details

The `build.js` script:
- Reads data from `config/data.json`
- Generates HTML using JavaScript template literals
- Outputs the final `index.html` file
- Provides build statistics

### Error Handling
The script includes error handling for:
- Missing configuration files
- Invalid JSON format
- File system errors

## 📊 Example Data Structure

```json
{
  "personal": { ... },
  "education": [
    {
      "period": "[2020-2024]",
      "emoji": "🎉",
      "description": "Your education details..."
    }
  ],
  "projects": {
    "3d_reconstruction": [
      {
        "title": "🔥 Your Amazing Project",
        "authors": "Author list...",
        "description": "Project description...",
        "venue": "Conference/Journal",
        "image": "./assets/pipelines/project-image.png",
        "links": [
          {"type": "Paper", "url": "https://..."},
          {"type": "Code", "url": "https://github.com/..."}
        ]
      }
    ]
  }
}
```

## 🚀 Quick Start for New Content

### Adding a New Publication
1. Add project images to `assets/pipelines/`
2. Add project entry to `config/data.json` in the appropriate category
3. Run `node build.js`
4. Done!

### Adding News
1. Add new entry to the `news` array in `config/data.json`
2. Run `node build.js`
3. Your news appears on the homepage!

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest improvements
- Submit pull requests
- Share customization ideas

## 📄 License

MIT License - feel free to use and modify for your own homepage!

## 🙋‍♂️ Acknowledgement

This personal academic homepage is inspired by the elegant designs and structures of the following repositories and individuals:

- [Renrui Zhang's Homepage](https://zrrskywalker.github.io/)
- [Song Chen's Homepage](https://song-chen1.github.io)
- [Purshow's Homepage](https://Purshow.github.io)


---

**Happy website building! 🎉**

---

*This template was created for academic personal homepages but can be adapted for various professional use cases.*