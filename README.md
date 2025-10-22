# PEP Adolescent Timetable Visualizer

A beautiful, interactive timetable visualizer that allows users to upload CSV files and generate real-time timetable visualizations.

## Features

- 📁 **CSV Upload**: Drag & drop or browse to upload timetable CSV files
- 🎨 **Beautiful UI**: Modern, responsive design with glass-morphism effects
- 🔍 **Smart Filtering**: Filter by teacher, subject, or student
- 📊 **Real-time Visualization**: Instant timetable generation from uploaded CSV
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 📥 **Export Functionality**: Download filtered data as CSV

## CSV Format

Your CSV file should have the following columns:
- `Day` - Day of the week (Mon, Tue, Wed, Thu, Fri)
- `Slot` - Time slot number (1, 2, 3, 4, 5)
- `Track` - Track number (for internal use)
- `Teacher` - Teacher name
- `Code` - Class code
- `Subject` - Subject name (Science, Math, SST, English)
- `Students` - Comma-separated list of students

### Example CSV Format:
```csv
Day,Slot,Track,Teacher,Code,Subject,Students
Mon,1,1,Sanya,Sanya_2,Math,"Nithil, Aakash, Nuha, Karthika"
Mon,1,2,Usha,Usha_2,Math,"Aashmi, Arhan, Trisha, Vedaant, Kanav"
```

## Deployment Options

### Option 1: Vercel (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Deploy automatically - no configuration needed!

### Option 2: Netlify
1. Push your code to GitHub
2. Connect your GitHub repo to Netlify
3. Set build command: `echo "Static site"`
4. Set publish directory: `/` (root)
5. Deploy!

### Option 3: GitHub Pages
1. Push your code to GitHub
2. Go to Settings > Pages
3. Select source: "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Your site will be available at `https://yourusername.github.io/repository-name`

### Option 4: Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd pep-adolescent-timetable

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

## Usage

1. **Upload CSV**: Drag and drop your timetable CSV file or click "Browse Files"
2. **View Timetable**: The timetable will be generated automatically
3. **Filter Data**: Use the dropdown filters to narrow down the view
4. **Export**: Click "Export" to download filtered data as CSV
5. **Remove File**: Click the "×" button to upload a different file

## File Requirements

- **Format**: CSV files only
- **Size**: Maximum 5MB
- **Encoding**: UTF-8 recommended
- **Headers**: Must include all required columns

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use for educational purposes!
