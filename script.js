// Timetable Data and Application Logic
class TimetableApp {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.filters = {
            teacher: '',
            subject: '',
            student: ''
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.hideLoading();
        this.showUploadInterface();
    }

    async loadData() {
        try {
            const response = await fetch('relaxed_timetable - 22oct.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            console.log('CSV loaded successfully, length:', csvText.length);
            this.data = this.parseCSV(csvText);
            console.log('Parsed data:', this.data.length, 'rows');
            this.filteredData = [...this.data];
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback: use the actual CSV data embedded
            this.data = this.getFullData();
            this.filteredData = [...this.data];
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim() : '';
                });
                data.push(row);
            }
        }

        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    getFullData() {
        // New CSV data embedded as fallback (22 Oct version)
        return [
            {Day: 'Mon', Slot: '1', Track: '1', Teacher: 'Sanya', Code: 'Sanya_2', Subject: 'Math', Students: 'Nithil, Aakash, Nuha, Karthika'},
            {Day: 'Mon', Slot: '1', Track: '2', Teacher: 'Usha', Code: 'Usha_2', Subject: 'Math', Students: 'Aashmi, Arhan, Trisha, Vedaant, Kanav'},
            {Day: 'Mon', Slot: '1', Track: '3', Teacher: 'Zeba', Code: 'SST_2', Subject: 'SST', Students: 'Anik, Mohammad, Arjun, Sathvik'},
            {Day: 'Mon', Slot: '2', Track: '1', Teacher: 'Guru', Code: 'Sci_5', Subject: 'Science', Students: 'Kanav, Myra, Sayan, Trisha, Mythili, Shlok'},
            {Day: 'Mon', Slot: '2', Track: '2', Teacher: 'Sanya', Code: 'Sanya_4', Subject: 'Math', Students: 'Neil, Mohammad'},
            {Day: 'Mon', Slot: '2', Track: '3', Teacher: 'Usha', Code: 'Usha_1', Subject: 'Math', Students: 'Anshika, Asmi, Arjun, Arhat'},
            {Day: 'Mon', Slot: '2', Track: '4', Teacher: 'Zeba', Code: 'Eng_1', Subject: 'English', Students: 'Ekaansh, Aakash'},
            {Day: 'Mon', Slot: '3', Track: '1', Teacher: 'Guru', Code: 'Sci_3', Subject: 'Science', Students: 'Aashmi, Vedaant, Anshika, Archana, Asmi, Sahan'},
            {Day: 'Mon', Slot: '3', Track: '2', Teacher: 'Sanya', Code: 'Sanya_3', Subject: 'Math', Students: 'Ishita, Abhigya, Sathvik'},
            {Day: 'Mon', Slot: '3', Track: '3', Teacher: 'Usha', Code: 'Usha_5', Subject: 'Math', Students: 'Sruthi'},
            {Day: 'Mon', Slot: '3', Track: '4', Teacher: 'Zeba', Code: 'SST_1', Subject: 'SST', Students: 'Arhat, Neil, Parth, Ekaansh, Karthika, Nithil, Aakash'},
            {Day: 'Mon', Slot: '4', Track: '1', Teacher: 'Sanya', Code: 'Sanya_1', Subject: 'Math', Students: 'Ekaansh, Parth'},
            {Day: 'Mon', Slot: '4', Track: '2', Teacher: 'Usha', Code: 'Usha_3', Subject: 'Math', Students: 'Archana, Myra, Mythili, Shlok'},
            {Day: 'Mon', Slot: '4', Track: '3', Teacher: 'Zeba', Code: 'SST_3', Subject: 'SST', Students: 'Kanav, Abhigya, Sruthi, Nuha, Sahan, Sayan, Ishita'},
            {Day: 'Tue', Slot: '1', Track: '1', Teacher: 'Gayatri', Code: 'Eng_2', Subject: 'English', Students: 'Aashmi, Abhigya, Ishita, Neil, Nithil, Sathvik, Sayan, Arjun, Mohammad'},
            {Day: 'Tue', Slot: '1', Track: '2', Teacher: 'Sanya', Code: 'Sanya_1', Subject: 'Math', Students: 'Ekaansh, Parth'},
            {Day: 'Tue', Slot: '1', Track: '3', Teacher: 'Usha', Code: 'Usha_5', Subject: 'Math', Students: 'Sruthi'},
            {Day: 'Tue', Slot: '1', Track: '4', Teacher: 'Zeba', Code: 'SST_5', Subject: 'SST', Students: 'Myra, Mythili, Archana, Vedaant, Shlok'},
            {Day: 'Tue', Slot: '2', Track: '1', Teacher: 'Sanya', Code: 'Sanya_2', Subject: 'Math', Students: 'Nithil, Aakash, Nuha, Karthika'},
            {Day: 'Tue', Slot: '2', Track: '2', Teacher: 'Usha', Code: 'Usha_1', Subject: 'Math', Students: 'Anshika, Asmi, Arjun, Arhat'},
            {Day: 'Tue', Slot: '2', Track: '3', Teacher: 'Usha', Code: 'Usha_2', Subject: 'Math', Students: 'Aashmi, Arhan, Trisha, Vedaant, Kanav'},
            {Day: 'Tue', Slot: '3', Track: '1', Teacher: 'Gayatri', Code: 'Eng_5', Subject: 'English', Students: 'Asmi, Nuha, Sahan, Shlok, Sruthi, Vedaant'},
            {Day: 'Tue', Slot: '3', Track: '2', Teacher: 'Sanya', Code: 'Sanya_3', Subject: 'Math', Students: 'Ishita, Abhigya, Sathvik'},
            {Day: 'Tue', Slot: '3', Track: '3', Teacher: 'Usha', Code: 'Usha_4', Subject: 'Math', Students: 'Anik, Sahan, Sayan'},
            {Day: 'Tue', Slot: '3', Track: '4', Teacher: 'Zeba', Code: 'SST_1', Subject: 'SST', Students: 'Arhat, Neil, Parth, Ekaansh, Karthika, Nithil, Aakash'},
            {Day: 'Tue', Slot: '4', Track: '1', Teacher: 'Gayatri', Code: 'Eng_1', Subject: 'English', Students: 'Ekaansh, Aakash'},
            {Day: 'Tue', Slot: '4', Track: '2', Teacher: 'Gayatri', Code: 'Eng_3', Subject: 'English', Students: 'Anik, Parth, Arhan, Arhat, Karthika, Kanav'},
            {Day: 'Tue', Slot: '4', Track: '3', Teacher: 'Sanya', Code: 'Sanya_4', Subject: 'Math', Students: 'Neil, Mohammad'},
            {Day: 'Tue', Slot: '4', Track: '4', Teacher: 'Usha', Code: 'Usha_3', Subject: 'Math', Students: 'Archana, Myra, Mythili, Shlok'},
            {Day: 'Wed', Slot: '1', Track: '1', Teacher: 'Guru', Code: 'Sci_3', Subject: 'Science', Students: 'Aashmi, Vedaant, Anshika, Archana, Asmi, Sahan'},
            {Day: 'Wed', Slot: '1', Track: '2', Teacher: 'Sanya', Code: 'Sanya_1', Subject: 'Math', Students: 'Ekaansh, Parth'},
            {Day: 'Wed', Slot: '1', Track: '3', Teacher: 'Shravani', Code: 'Sci_1', Subject: 'Science', Students: 'Neil, Aakash, Arhat, Abhigya, Sruthi'},
            {Day: 'Wed', Slot: '1', Track: '4', Teacher: 'Zeba', Code: 'SST_2', Subject: 'SST', Students: 'Anik, Mohammad, Arjun, Sathvik'},
            {Day: 'Wed', Slot: '2', Track: '1', Teacher: 'Guru', Code: 'Sci_5', Subject: 'Science', Students: 'Kanav, Myra, Sayan, Trisha, Mythili, Shlok'},
            {Day: 'Wed', Slot: '2', Track: '2', Teacher: 'Sanya', Code: 'Sanya_3', Subject: 'Math', Students: 'Ishita, Abhigya, Sathvik'},
            {Day: 'Wed', Slot: '2', Track: '3', Teacher: 'Zeba', Code: 'SST_1', Subject: 'SST', Students: 'Arhat, Neil, Parth, Ekaansh, Karthika, Nithil, Aakash'},
            {Day: 'Wed', Slot: '3', Track: '1', Teacher: 'Sanya', Code: 'Sanya_2', Subject: 'Math', Students: 'Nithil, Aakash, Nuha, Karthika'},
            {Day: 'Wed', Slot: '3', Track: '2', Teacher: 'Zeba', Code: 'SST_4', Subject: 'SST', Students: 'Arhan, Asmi, Anshika, Trisha, Aashmi'},
            {Day: 'Wed', Slot: '4', Track: '1', Teacher: 'Guru', Code: 'Sci_4', Subject: 'Science', Students: 'Arhan, Arjun, Nithil, Parth, Sathvik, Anik'},
            {Day: 'Wed', Slot: '4', Track: '2', Teacher: 'Sanya', Code: 'Sanya_4', Subject: 'Math', Students: 'Neil, Mohammad'},
            {Day: 'Wed', Slot: '4', Track: '3', Teacher: 'Shravani', Code: 'Sci_2', Subject: 'Science', Students: 'Mohammad, Ekaansh, Ishita, Nuha, Karthika'},
            {Day: 'Thu', Slot: '1', Track: '1', Teacher: 'Gayatri', Code: 'Eng_4', Subject: 'English', Students: 'Anshika, Archana, Myra, Mythili, Trisha'},
            {Day: 'Thu', Slot: '1', Track: '2', Teacher: 'Guru', Code: 'Sanya_1', Subject: 'Math', Students: 'Ekaansh, Parth'},
            {Day: 'Thu', Slot: '1', Track: '3', Teacher: 'Shravani', Code: 'Sci_1', Subject: 'Science', Students: 'Neil, Aakash, Arhat, Abhigya, Sruthi'},
            {Day: 'Thu', Slot: '1', Track: '4', Teacher: 'Usha', Code: 'Usha_4', Subject: 'Math', Students: 'Anik, Sahan, Sayan'},
            {Day: 'Thu', Slot: '2', Track: '1', Teacher: 'Gayatri', Code: 'Eng_1', Subject: 'English', Students: 'Ekaansh, Aakash'},
            {Day: 'Thu', Slot: '2', Track: '2', Teacher: 'Guru', Code: 'Sci_4', Subject: 'Science', Students: 'Arhan, Arjun, Nithil, Parth, Sathvik, Anik'},
            {Day: 'Thu', Slot: '2', Track: '3', Teacher: 'Usha', Code: 'Usha_3', Subject: 'Math', Students: 'Archana, Myra, Mythili, Shlok'},
            {Day: 'Thu', Slot: '2', Track: '4', Teacher: 'Zeba', Code: 'SST_3', Subject: 'SST', Students: 'Kanav, Abhigya, Sruthi, Nuha, Sahan, Sayan, Ishita'},
            {Day: 'Thu', Slot: '3', Track: '1', Teacher: 'Gayatri', Code: 'Eng_2', Subject: 'English', Students: 'Aashmi, Abhigya, Ishita, Neil, Nithil, Sathvik, Sayan, Arjun, Mohammad'},
            {Day: 'Thu', Slot: '3', Track: '2', Teacher: 'Gayatri', Code: 'Eng_3', Subject: 'English', Students: 'Anik, Parth, Arhan, Arhat, Karthika, Kanav'},
            {Day: 'Thu', Slot: '3', Track: '3', Teacher: 'Usha', Code: 'Usha_5', Subject: 'Math', Students: 'Sruthi'},
            {Day: 'Thu', Slot: '3', Track: '4', Teacher: 'Zeba', Code: 'SST_5', Subject: 'SST', Students: 'Myra, Mythili, Archana, Vedaant, Shlok'},
            {Day: 'Thu', Slot: '4', Track: '1', Teacher: 'Shravani', Code: 'Sci_2', Subject: 'Science', Students: 'Mohammad, Ekaansh, Ishita, Nuha, Karthika'},
            {Day: 'Thu', Slot: '4', Track: '2', Teacher: 'Usha', Code: 'Usha_1', Subject: 'Math', Students: 'Anshika, Asmi, Arjun, Arhat'},
            {Day: 'Thu', Slot: '4', Track: '3', Teacher: 'Usha', Code: 'Usha_2', Subject: 'Math', Students: 'Aashmi, Arhan, Trisha, Vedaant, Kanav'},
            {Day: 'Fri', Slot: '4', Track: '1', Teacher: 'Shravani', Code: 'Sci_1', Subject: 'Science', Students: 'Neil, Aakash, Arhat, Abhigya, Sruthi'},
            {Day: 'Fri', Slot: '4', Track: '2', Teacher: 'Zeba', Code: 'SST_2', Subject: 'SST', Students: 'Anik, Mohammad, Arjun, Sathvik'},
            {Day: 'Fri', Slot: '5', Track: '1', Teacher: 'Shravani', Code: 'Sci_2', Subject: 'Science', Students: 'Mohammad, Ekaansh, Ishita, Nuha, Karthika'},
            {Day: 'Fri', Slot: '5', Track: '2', Teacher: 'Zeba', Code: 'SST_4', Subject: 'SST', Students: 'Arhan, Asmi, Anshika, Trisha, Aashmi'}
        ];
    }

    setupEventListeners() {
        // File upload events
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('csv-file-input');
        const browseBtn = document.getElementById('browse-btn');
        const removeFileBtn = document.getElementById('remove-file');

        // Debug logging
        console.log('Setting up event listeners...');
        console.log('Upload area:', uploadArea);
        console.log('File input:', fileInput);
        console.log('Browse button:', browseBtn);

        // Browse button
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Browse button clicked');
                if (fileInput) {
                    fileInput.click();
                } else {
                    console.error('File input not found');
                }
            });
        } else {
            console.error('Browse button not found');
        }

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                console.log('File input changed, files:', e.target.files.length);
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        } else {
            console.error('File input not found for change event');
        }

        // Drag and drop events
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
        } else {
            console.error('Upload area not found');
        }

        if (uploadArea) {
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
            });

            uploadArea.addEventListener('click', () => {
                if (fileInput) {
                    fileInput.click();
                }
            });
        }

        // Remove file
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                this.removeFile();
            });
        } else {
            console.error('Remove file button not found');
        }

        // Filters
        const teacherFilter = document.getElementById('teacher-filter');
        const subjectFilter = document.getElementById('subject-filter');
        const studentDropdown = document.getElementById('student-dropdown');

        if (teacherFilter) {
            teacherFilter.addEventListener('change', (e) => {
                this.filters.teacher = e.target.value;
                this.applyFilters();
            });
        }

        if (subjectFilter) {
            subjectFilter.addEventListener('change', (e) => {
                this.filters.subject = e.target.value;
                this.applyFilters();
            });
        }

        // Student dropdown
        if (studentDropdown) {
            studentDropdown.addEventListener('change', (e) => {
                this.filters.student = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    populateFilters() {
        const teachers = [...new Set(this.data.map(row => row.Teacher))].sort();
        const subjects = [...new Set(this.data.map(row => row.Subject))].sort();
        
        // Get all unique students
        const allStudents = new Set();
        this.data.forEach(row => {
            row.Students.split(', ').forEach(student => {
                if (student.trim()) {
                    allStudents.add(student.trim());
                }
            });
        });
        const students = Array.from(allStudents).sort();

        const teacherFilter = document.getElementById('teacher-filter');
        const subjectFilter = document.getElementById('subject-filter');
        const studentDropdown = document.getElementById('student-dropdown');

        teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher;
            option.textContent = teacher;
            teacherFilter.appendChild(option);
        });

        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectFilter.appendChild(option);
        });

        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student;
            option.textContent = student;
            studentDropdown.appendChild(option);
        });
    }

    handleFileUpload(file) {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please upload a CSV file.');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }

        // Show file info
        this.showFileInfo(file);

        // Read and process the file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                this.data = this.parseCSV(csvText);
                this.filteredData = [...this.data];
                
                // Show controls and render timetable
                this.showControls();
                this.populateFilters();
                this.renderTimetable();
            } catch (error) {
                alert('Error reading CSV file. Please check the format.');
                console.error('CSV parsing error:', error);
            }
        };
        reader.readAsText(file);
    }

    showFileInfo(file) {
        const uploadArea = document.getElementById('upload-area');
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');

        uploadArea.style.display = 'none';
        fileName.textContent = file.name;
        fileInfo.style.display = 'block';
    }

    removeFile() {
        const uploadArea = document.getElementById('upload-area');
        const fileInfo = document.getElementById('file-info');
        const controls = document.getElementById('controls');
        const fileInput = document.getElementById('csv-file-input');

        // Reset file input
        fileInput.value = '';
        
        // Show upload area, hide file info and controls
        uploadArea.style.display = 'block';
        fileInfo.style.display = 'none';
        controls.style.display = 'none';

        // Clear data
        this.data = [];
        this.filteredData = [];
        
        // Clear timetable
        const container = document.getElementById('timetable-grid');
        container.innerHTML = '';
    }

    showUploadInterface() {
        const uploadArea = document.getElementById('upload-area');
        const fileInfo = document.getElementById('file-info');
        const controls = document.getElementById('controls');
        
        // Show upload area, hide file info and controls initially
        uploadArea.style.display = 'block';
        fileInfo.style.display = 'none';
        controls.style.display = 'none';
    }

    showControls() {
        const controls = document.getElementById('controls');
        controls.style.display = 'flex';
    }

    applyFilters() {
        this.filteredData = this.data.filter(row => {
            const teacherMatch = !this.filters.teacher || row.Teacher === this.filters.teacher;
            const subjectMatch = !this.filters.subject || row.Subject === this.filters.subject;
            const studentMatch = !this.filters.student || 
                row.Students.toLowerCase().includes(this.filters.student);

            return teacherMatch && subjectMatch && studentMatch;
        });

        this.renderTimetable();
    }


    renderTimetable() {
        const container = document.getElementById('timetable-grid');
        container.innerHTML = '';

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const slots = ['1', '2', '3', '4', '5'];

        // Create header row with days
        const headerRow = document.createElement('div');
        headerRow.className = 'grid-header';
        headerRow.textContent = 'Time/Day';
        container.appendChild(headerRow);

        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'grid-header';
            header.textContent = day;
            container.appendChild(header);
        });

        // Create rows for each time slot
        slots.forEach(slot => {
            // Time slot label (first column of each row)
            const timeCell = document.createElement('div');
            timeCell.className = 'grid-cell time-slot';
            timeCell.textContent = `Slot ${slot}`;
            container.appendChild(timeCell);

            // Classes for each day in this time slot
            days.forEach(day => {
                const classes = this.filteredData.filter(row => 
                    row.Day === day && row.Slot === slot
                );

                const cell = document.createElement('div');
                cell.className = 'grid-cell class-slot';

                if (classes.length > 0) {
                    classes.forEach(cls => {
                        const classDiv = document.createElement('div');
                        classDiv.className = 'class-info';
                        
                        classDiv.innerHTML = `
                            <div class="class-teacher">${cls.Teacher} | ${cls.Subject}</div>
                            <div class="class-students">${cls.Students}</div>
                        `;
                        
                        classDiv.classList.add(`subject-${cls.Subject.toLowerCase()}`);
                        cell.appendChild(classDiv);
                    });
                } else {
                    // Show "Free" for empty slots
                    cell.innerHTML = '<div style="color: #ccc; font-style: italic;">Free</div>';
                }

                container.appendChild(cell);
            });
        });
    }



    exportData() {
        const csvContent = this.convertToCSV(this.filteredData);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetable_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TimetableApp();
});
