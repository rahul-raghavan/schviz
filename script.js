// Timetable Data and Application Logic
class TimetableApp {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.filters = {
            teacher: [],
            subject: [],
            student: []
        };

        this.dataSlotTimes = {};
        this.slotTimeOverrides = {};
        this.breaks = [];
        
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
            const parsed = this.parseTimetableFile(csvText, 'relaxed_timetable - 22oct.csv');
            this.setTimetableData(parsed.rows, parsed.slotTimes, parsed.breaks);
            console.log('Parsed data:', this.data.length, 'rows');
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback: use the actual CSV data embedded
            this.setTimetableData(this.getFullData(), {}, []);
        }
    }

    parseTimetableFile(fileText, fileName) {
        if (fileName.toLowerCase().endsWith('.json')) {
            return this.parseTimetableJSON(fileText);
        }

        const rows = this.parseCSV(fileText);
        return {
            rows: this.normalizeTimetableRows(rows),
            slotTimes: this.extractSlotTimes(rows),
            breaks: this.extractBreaks(rows)
        };
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
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

    parseTimetableJSON(jsonText) {
        const payload = JSON.parse(jsonText);
        const entries = Array.isArray(payload) ? payload : (payload.entries || []);
        const slotTimes = this.normalizeSlotTimes(payload.slotTimes || {});
        const breaks = Array.isArray(payload) ? [] : this.normalizeBreaks(payload.breaks || []);

        return {
            rows: entries.map(entry => {
                const slot = String(entry.slot ?? entry.Slot ?? '');
                const students = Array.isArray(entry.students)
                    ? entry.students.join(', ')
                    : String(entry.students ?? entry.Students ?? '');

                const teacher = String(entry.teacher ?? entry.Teacher ?? '');
                const teachersList = Array.isArray(entry.teachers)
                    ? entry.teachers.join(', ')
                    : String(entry.teachers ?? entry.Teachers ?? teacher);

                return {
                    Day: String(entry.day ?? entry.Day ?? ''),
                    Slot: slot,
                    Track: String(entry.track ?? entry.Track ?? ''),
                    Teacher: teacher,
                    TeachersList: teachersList,
                    Code: String(entry.code ?? entry.Code ?? ''),
                    Subject: String(entry.subject ?? entry.Subject ?? ''),
                    Students: students,
                    StartTime: slotTimes[slot] || ''
                };
            }),
            slotTimes,
            breaks
        };
    }

    normalizeTimetableRows(rows) {
        return rows.filter(row => {
            const rowType = (row.RowType || '').trim().toLowerCase();
            if (rowType && rowType !== 'session') return false;
            return row.Day && row.Slot && row.Teacher && row.Subject;
        });
    }

    extractSlotTimes(rows) {
        const slotTimes = {};
        const timeColumns = ['StartTime', 'SlotTime', 'Time', 'startTime', 'slotTime', 'time'];

        rows.forEach(row => {
            const slot = String(row.Slot || '').trim();
            if (!slot) return;

            const rowType = (row.RowType || '').trim().toLowerCase();
            const hasTimeColumn = timeColumns.some(column => (row[column] || '').trim());
            if (rowType && rowType !== 'slot_time' && !hasTimeColumn) return;

            const time = timeColumns
                .map(column => (row[column] || '').trim())
                .find(Boolean);

            if (time && !slotTimes[slot]) {
                slotTimes[slot] = time;
            }
        });

        return slotTimes;
    }

    extractBreaks(rows) {
        return this.normalizeBreaks(
            rows
                .filter(row => (row.RowType || '').trim().toLowerCase() === 'break')
                .map(row => ({
                    afterSlot: row.AfterSlot || row.afterSlot || row.Slot,
                    label: row.Label || row.Name || row.Title || row.Subject,
                    time: row.Time || row.StartTime || row.SlotTime
                }))
        );
    }

    normalizeSlotTimes(slotTimes) {
        return Object.entries(slotTimes).reduce((normalized, [slot, time]) => {
            const slotId = String(slot).trim();
            const slotTime = String(time || '').trim();
            if (slotId && slotTime) {
                normalized[slotId] = slotTime;
            }
            return normalized;
        }, {});
    }

    normalizeBreaks(breaks) {
        return breaks
            .map((breakItem, index) => {
                const afterSlot = String(
                    breakItem.afterSlot ??
                    breakItem.after_slot ??
                    breakItem.after ??
                    breakItem.slotAfter ??
                    breakItem.slot ??
                    ''
                ).trim();

                if (!afterSlot) return null;

                const label = String(
                    breakItem.label ??
                    breakItem.name ??
                    breakItem.title ??
                    'Break'
                ).trim() || 'Break';

                const time = String(
                    breakItem.time ??
                    breakItem.Time ??
                    breakItem.startTime ??
                    breakItem.StartTime ??
                    ''
                ).trim();

                return {
                    id: `break-${afterSlot}-${index}`,
                    afterSlot,
                    label,
                    time,
                    order: index
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const slotDelta = Number(a.afterSlot) - Number(b.afterSlot);
                if (!Number.isNaN(slotDelta) && slotDelta !== 0) {
                    return slotDelta;
                }
                return a.order - b.order;
            });
    }

    setTimetableData(rows, slotTimes, breaks = []) {
        this.data = rows;
        this.filteredData = [...rows];
        this.dataSlotTimes = this.normalizeSlotTimes(slotTimes);
        this.breaks = this.normalizeBreaks(breaks);
        this.slotTimeOverrides = {};
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
        const fileInput = document.getElementById('csv-file-input');
        const browseBtn = document.getElementById('browse-btn');
        const removeFileBtn = document.getElementById('remove-file');

        // Debug logging
        console.log('Setting up event listeners...');
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

        // Drag and drop events removed - using simple button upload

        // Remove file
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                this.removeFile();
            });
        } else {
            console.error('Remove file button not found');
        }

        // Filters — multiselect dropdowns
        const filterKeys = ['teacher', 'subject', 'student'];
        filterKeys.forEach(key => {
            const group = document.getElementById(`${key}-filter`);
            if (group) {
                group.addEventListener('change', (e) => {
                    if (e.target.matches('input[type="checkbox"]')) {
                        this.onFilterToggle(key);
                    }
                });
            }
        });

        document.querySelectorAll('.multiselect-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = trigger.dataset.filter;
                if (filterKeys.includes(key)) {
                    this.toggleMultiselect(key);
                }
            });
        });

        document.querySelectorAll('.btn-clear-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.filter;
                if (filterKeys.includes(key)) {
                    this.clearFilter(key);
                }
            });
        });

        // Close any open multiselect on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multiselect')) {
                this.closeAllMultiselects();
            }
        });

        // ESC closes any open multiselect
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllMultiselects();
            }
        });

        // PDF Export button
        const pdfExportBtn = document.getElementById('pdf-export-btn');
        if (pdfExportBtn) {
            pdfExportBtn.addEventListener('click', () => {
                this.exportToPDF();
            });
        }

        const bulkPdfExportBtn = document.getElementById('bulk-pdf-export-btn');
        if (bulkPdfExportBtn) {
            bulkPdfExportBtn.addEventListener('click', () => {
                this.exportAllPDFs();
            });
        }

        // Slot times editor
        const editTimesBtn = document.getElementById('edit-times-btn');
        const closeTimesEditor = document.getElementById('close-times-editor');
        const updateTimesBtn = document.getElementById('update-times-btn');

        if (editTimesBtn) {
            editTimesBtn.addEventListener('click', () => {
                this.showSlotTimesEditor();
            });
        }

        if (closeTimesEditor) {
            closeTimesEditor.addEventListener('click', () => {
                this.hideSlotTimesEditor();
            });
        }

        if (updateTimesBtn) {
            updateTimesBtn.addEventListener('click', () => {
                this.updateSlotTimes();
            });
        }
    }

    populateFilters() {
        // Extract individual teachers from teacher lists, including JSON `teachers` arrays.
        const allTeachers = new Set();
        this.data.forEach(row => {
            this.getRowTeachers(row).forEach(teacher => allTeachers.add(teacher));
        });
        const teachers = Array.from(allTeachers).sort();
        
        const subjects = [...new Set(this.data.map(row => row.Subject))].sort();
        
        // Get all unique students (exclude "ALL")
        const allStudents = new Set();
        this.data.forEach(row => {
            // Skip rows with "ALL" students
            if (row.Students.toUpperCase().trim() !== 'ALL') {
                row.Students.split(', ').forEach(student => {
                    const trimmed = student.trim();
                    if (trimmed && trimmed.toUpperCase() !== 'ALL') {
                        allStudents.add(trimmed);
                    }
                });
            }
        });
        const students = Array.from(allStudents).sort();

        this.renderCheckboxGroup('teacher-filter', teachers, this.filters.teacher);
        this.renderCheckboxGroup('subject-filter', subjects, this.filters.subject);
        this.renderCheckboxGroup('student-filter', students, this.filters.student);

        ['teacher', 'subject', 'student'].forEach(key => this.updateMultiselectLabel(key));
    }

    renderCheckboxGroup(containerId, values, selected) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        values.forEach(value => {
            const label = document.createElement('label');
            label.className = 'checkbox-item';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = value;
            input.checked = selected.includes(value);

            const text = document.createElement('span');
            text.textContent = value;

            label.appendChild(input);
            label.appendChild(text);
            container.appendChild(label);
        });
    }

    onFilterToggle(key) {
        const group = document.getElementById(`${key}-filter`);
        if (!group) return;
        this.filters[key] = Array.from(
            group.querySelectorAll('input[type="checkbox"]:checked')
        ).map(input => input.value);
        this.updateMultiselectLabel(key);
        this.applyFilters();
    }

    clearFilter(key) {
        this.filters[key] = [];
        const group = document.getElementById(`${key}-filter`);
        if (group) {
            group.querySelectorAll('input[type="checkbox"]').forEach(input => {
                input.checked = false;
            });
        }
        this.updateMultiselectLabel(key);
        this.applyFilters();
    }

    updateMultiselectLabel(key) {
        const wrapper = document.querySelector(`.multiselect[data-filter="${key}"]`);
        if (!wrapper) return;
        const labelEl = wrapper.querySelector('.multiselect-label');
        const trigger = wrapper.querySelector('.multiselect-trigger');
        const selected = this.filters[key];
        const defaults = { teacher: 'All Teachers', subject: 'All Subjects', student: 'All Students' };

        if (selected.length === 0) {
            labelEl.textContent = defaults[key];
            trigger.classList.remove('has-selection');
        } else if (selected.length <= 2) {
            labelEl.textContent = selected.join(', ');
            trigger.classList.add('has-selection');
        } else {
            labelEl.textContent = `${selected.length} selected`;
            trigger.classList.add('has-selection');
        }
    }

    toggleMultiselect(key) {
        const wrapper = document.querySelector(`.multiselect[data-filter="${key}"]`);
        if (!wrapper) return;
        const isOpen = wrapper.classList.contains('open');
        this.closeAllMultiselects();
        if (!isOpen) {
            wrapper.classList.add('open');
        }
    }

    closeAllMultiselects() {
        document.querySelectorAll('.multiselect.open').forEach(el => {
            el.classList.remove('open');
        });
    }

    handleFileUpload(file) {
        // Validate file type
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.json')) {
            alert('Please upload a CSV or JSON timetable file.');
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
                const fileText = e.target.result;
                const parsed = this.parseTimetableFile(fileText, file.name);
                this.setTimetableData(parsed.rows, parsed.slotTimes, parsed.breaks);
                
                // Show controls and render timetable
                this.showControls();
                this.populateFilters();
                this.renderTimetable();
            } catch (error) {
                alert('Error reading timetable file. Please check the format.');
                console.error('Timetable parsing error:', error);
            }
        };
        reader.readAsText(file);
    }

    showFileInfo(file) {
        const uploadCompact = document.getElementById('upload-compact');
        const fileIndicator = document.getElementById('file-indicator');
        const fileName = document.getElementById('file-name');

        uploadCompact.style.display = 'none';
        fileName.textContent = file.name;
        fileIndicator.style.display = 'flex';
    }

    removeFile() {
        const uploadCompact = document.getElementById('upload-compact');
        const fileIndicator = document.getElementById('file-indicator');
        const controls = document.getElementById('controls');
        const fileInput = document.getElementById('csv-file-input');

        // Reset file input
        fileInput.value = '';
        
        // Show upload button, hide file indicator and controls
        uploadCompact.style.display = 'flex';
        fileIndicator.style.display = 'none';
        controls.style.display = 'none';

        // Clear data
        this.data = [];
        this.filteredData = [];
        this.dataSlotTimes = {};
        this.slotTimeOverrides = {};
        this.breaks = [];
        this.filters = { teacher: [], subject: [], student: [] };
        ['teacher', 'subject', 'student'].forEach(key => this.updateMultiselectLabel(key));
        this.closeAllMultiselects();
        
        // Clear timetable
        const container = document.getElementById('timetable-grid');
        container.innerHTML = '';
    }

    showSlotTimesEditor() {
        const editor = document.getElementById('slot-times-editor');
        const grid = document.getElementById('slot-times-grid');
        
        if (!editor || !grid) return;
        
        // Get all slots from data
        const slots = this.getSlotsFromData();
        
        // Clear and populate the grid
        grid.innerHTML = '';
        
        slots.forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'slot-time-item';
            slotDiv.innerHTML = `
                <label for="slot-time-${slot.id}">Slot ${slot.id}:</label>
                <input type="text" 
                       id="slot-time-${slot.id}" 
                       class="slot-time-input" 
                       value="${slot.time || ''}" 
                       placeholder="e.g., 9:00">
            `;
            grid.appendChild(slotDiv);
        });
        
        editor.style.display = 'block';
    }

    hideSlotTimesEditor() {
        const editor = document.getElementById('slot-times-editor');
        if (editor) {
            editor.style.display = 'none';
        }
    }

    updateSlotTimes() {
        const slots = this.getSlotsFromData();
        let updated = false;
        
        slots.forEach(slot => {
            const input = document.getElementById(`slot-time-${slot.id}`);
            const sourceTime = this.dataSlotTimes[slot.id] || '';
            if (input && input.value.trim() !== '') {
                const newTime = input.value.trim();
                if (newTime === sourceTime) {
                    if (Object.prototype.hasOwnProperty.call(this.slotTimeOverrides, slot.id)) {
                        delete this.slotTimeOverrides[slot.id];
                        updated = true;
                    }
                } else if (this.slotTimeOverrides[slot.id] !== newTime) {
                    this.slotTimeOverrides[slot.id] = newTime;
                    updated = true;
                }
            } else {
                // Clear time if input is empty
                if (this.getSlotTime(slot.id)) {
                    this.slotTimeOverrides[slot.id] = '';
                    updated = true;
                }
            }
        });
        
        if (updated) {
            // Regenerate the timetable
            this.renderTimetable();
            // Hide the editor
            this.hideSlotTimesEditor();
        }
    }

    showUploadInterface() {
        const uploadCompact = document.getElementById('upload-compact');
        const fileIndicator = document.getElementById('file-indicator');
        const controls = document.getElementById('controls');
        
        // Show upload button, hide file indicator and controls initially
        uploadCompact.style.display = 'flex';
        fileIndicator.style.display = 'none';
        controls.style.display = 'none';
    }

    showControls() {
        const controls = document.getElementById('controls');
        const pdfExportBtn = document.getElementById('pdf-export-btn');
        const bulkPdfExportBtn = document.getElementById('bulk-pdf-export-btn');
        controls.style.display = 'flex';
        pdfExportBtn.style.display = 'inline-flex';
        if (bulkPdfExportBtn) {
            bulkPdfExportBtn.style.display = 'inline-flex';
        }
    }

    applyFilters() {
        this.filteredData = this.data.filter(row => {
            // Teacher: row matches if any selected teacher appears in its comma-separated list
            let teacherMatch = true;
            if (this.filters.teacher.length > 0) {
                const teachers = this.getRowTeachers(row);
                teacherMatch = this.filters.teacher.some(t => teachers.includes(t));
            }

            const subjectMatch = this.filters.subject.length === 0
                || this.filters.subject.includes(row.Subject);

            // Student: "ALL" rows match any student selection; otherwise match by name
            let studentMatch = true;
            if (this.filters.student.length > 0) {
                const studentsUpper = row.Students.toUpperCase().trim();
                if (studentsUpper === 'ALL') {
                    studentMatch = true;
                } else {
                    const rowStudents = row.Students.split(',').map(s => s.trim().toLowerCase());
                    studentMatch = this.filters.student.some(s =>
                        rowStudents.includes(s.toLowerCase())
                    );
                }
            }

            return teacherMatch && subjectMatch && studentMatch;
        });

        this.renderTimetable();
    }


    getSlotsFromData() {
        // Get all unique slot IDs from the data, sorted numerically
        const slotSet = new Set();
        this.data.forEach(row => {
            if (row.Slot) {
                slotSet.add(row.Slot);
            }
        });
        
        // Convert to array, sort numerically (no upper limit - dynamic based on CSV data)
        const slots = Array.from(slotSet)
            .map(id => parseInt(id))
            .filter(id => !isNaN(id) && id >= 1)
            .sort((a, b) => a - b)
            .map(id => ({ 
                id: id.toString(),
                time: this.getSlotTime(id.toString())
            }));
        
        return slots;
    }

    getSlotTime(slotId) {
        const id = String(slotId);
        if (Object.prototype.hasOwnProperty.call(this.slotTimeOverrides, id)) {
            return this.slotTimeOverrides[id];
        }
        return this.dataSlotTimes[id] || '';
    }

    getBreaksAfterSlot(slotId) {
        return this.breaks.filter(breakItem => breakItem.afterSlot === String(slotId));
    }

    getScheduleRows() {
        const rows = [];
        this.getSlotsFromData().forEach(slot => {
            rows.push({ type: 'slot', slot });
            this.getBreaksAfterSlot(slot.id).forEach(breakItem => {
                rows.push({ type: 'break', breakItem });
            });
        });
        return rows;
    }

    getClassesForCell(day, slotId, dataRows) {
        const classes = dataRows.filter(row =>
            row.Day === day && row.Slot === slotId
        );

        if (
            classes.length === 0 &&
            this.filters.student.length === 1 &&
            this.filters.teacher.length === 0 &&
            this.filters.subject.length === 0
        ) {
            return [this.createStudyTimeClass(day, slotId)];
        }

        return classes;
    }

    createStudyTimeClass(day, slotId, studentName = this.filters.student[0] || '') {
        return {
            Day: day,
            Slot: slotId,
            Track: '',
            Teacher: 'Indie',
            Code: `StudyTime_${day}_${slotId}`,
            Subject: '', 
            Students: studentName,
            synthetic: true
        };
    }

    splitList(value) {
        return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
    }

    getRowTeachers(row) {
        const teacherText = String(row.TeachersList || row.Teacher || '');
        return teacherText
            .split(/\s*(?:,|\+|\/|&)\s*/)
            .map(teacher => teacher.trim())
            .filter(teacher => teacher && !['ALL', 'SELF', 'INDIE'].includes(teacher.toUpperCase()));
    }

    getClassTitle(cls) {
        const teacher = this.formatTeacher(cls);
        const subject = String(cls.Subject || '').trim();
        return subject ? `${teacher} | ${subject}` : teacher;
    }

    rowMatchesTeacher(row, teacherName) {
        return this.getRowTeachers(row).includes(teacherName);
    }

    rowMatchesStudent(row, studentName) {
        const studentsText = String(row.Students || '').trim();
        if (studentsText.toUpperCase() === 'ALL') {
            return true;
        }

        return this.splitList(studentsText)
            .some(student => student.toLowerCase() === studentName.toLowerCase());
    }

    formatTeacher(cls) {
        const teachers = this.splitList(cls.Teacher);
        return teachers.length > 1 ? teachers.join(' & ') : (teachers[0] || cls.Teacher);
    }

    formatStudents(cls) {
        if (String(cls.Students || '').toUpperCase().trim() === 'ALL') {
            return 'All Students';
        }

        return this.splitList(cls.Students).join(', ');
    }

    getSubjectClass(subject) {
        return `subject-${String(subject || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`;
    }

    renderClassDiv(cls) {
        const classDiv = document.createElement('div');
        classDiv.className = 'class-info';
        if (cls.synthetic) {
            classDiv.classList.add('synthetic-studytime');
        }
        classDiv.classList.add(this.getSubjectClass(cls.Subject));

        classDiv.innerHTML = `
            <div class="class-teacher">${this.getClassTitle(cls)}</div>
            <div class="class-students">${this.formatStudents(cls)}</div>
        `;

        return classDiv;
    }

    renderTimetable() {
        const container = document.getElementById('timetable-grid');
        container.innerHTML = '';

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const scheduleRows = this.getScheduleRows();

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

        scheduleRows.forEach(row => {
            if (row.type === 'break') {
                this.renderBreakRow(container, row.breakItem);
                return;
            }

            const slot = row.slot;
            // Time slot label (first column of each row)
            const timeCell = document.createElement('div');
            timeCell.className = 'grid-cell time-slot';
            timeCell.innerHTML = `
                <div class="slot-number">Slot ${slot.id}</div>
                ${slot.time ? `<div class="slot-time">${slot.time}</div>` : ''}
            `;
            container.appendChild(timeCell);

            // Classes for each day in this time slot
            days.forEach(day => {
                const classes = this.getClassesForCell(day, slot.id, this.filteredData);

                const cell = document.createElement('div');
                cell.className = 'grid-cell class-slot';

                if (classes.length > 0) {
                    classes.forEach(cls => {
                        cell.appendChild(this.renderClassDiv(cls));
                    });
                } else {
                    // Show "Free" for empty slots
                    cell.innerHTML = '<div style="color: #ccc; font-style: italic;">Free</div>';
                }

                container.appendChild(cell);
            });
        });
    }

    renderBreakRow(container, breakItem) {
        const timeCell = document.createElement('div');
        timeCell.className = 'grid-cell time-slot break-time-slot';
        timeCell.innerHTML = `
            <div class="slot-number">Break</div>
            ${breakItem.time ? `<div class="slot-time">${breakItem.time}</div>` : ''}
        `;
        container.appendChild(timeCell);

        const breakCell = document.createElement('div');
        breakCell.className = 'grid-cell break-row';
        breakCell.style.gridColumn = 'span 5';
        breakCell.innerHTML = `
            <div class="break-label">${breakItem.label}</div>
            ${breakItem.time ? `<div class="break-time">${breakItem.time}</div>` : ''}
        `;
        container.appendChild(breakCell);
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

    exportToPDF() {
        if (!this.data || this.data.length === 0) {
            alert('No data available to export. Please upload a timetable file first.');
            return;
        }

        const person = this.getSelectedPdfPerson();
        if (!person) return;

        this.renderPersonPdf(person);
    }

    getSelectedPdfPerson() {
        const teacherCount = this.filters.teacher.length;
        const studentCount = this.filters.student.length;
        const subjectCount = this.filters.subject.length;

        if (subjectCount > 0) {
            alert('Clear the subject filter before saving a single-person PDF.');
            return null;
        }

        if (teacherCount === 1 && studentCount === 0) {
            return { type: 'teacher', name: this.filters.teacher[0] };
        }

        if (studentCount === 1 && teacherCount === 0) {
            return { type: 'student', name: this.filters.student[0] };
        }

        if (teacherCount === 0 && studentCount === 0) {
            alert('Select exactly one teacher or one student before saving a PDF.');
            return null;
        }

        if (teacherCount > 0 && studentCount > 0) {
            alert('PDF export supports either one teacher or one student, not both. Clear one filter and try again.');
            return null;
        }

        alert('PDF export supports one person at a time. Select exactly one teacher or exactly one student.');
        return null;
    }

    getClassesForPdfCell(person, day, slotId) {
        const classes = this.data.filter(row => {
            if (row.Day !== day || row.Slot !== slotId) return false;
            if (person.type === 'class') return true;
            if (person.type === 'teacher') {
                return this.rowMatchesTeacher(row, person.name);
            }
            return this.rowMatchesStudent(row, person.name);
        });

        if (classes.length === 0 && person.type === 'student') {
            return [this.createStudyTimeClass(day, slotId, person.name)];
        }

        return classes;
    }

    renderPersonPdf(person) {
        const doc = this.buildPdfDocument(person);
        if (doc) {
            doc.save(`${this.toPdfFilename(person.name)}.pdf`);
        }
    }

    async exportAllPDFs() {
        if (!this.data || this.data.length === 0) {
            alert('No data available to export. Please upload a timetable file first.');
            return;
        }

        if (!window.JSZip) {
            alert('Bulk PDF export is still loading. Please wait a moment and try again.');
            return;
        }

        const bulkBtn = document.getElementById('bulk-pdf-export-btn');
        const originalText = bulkBtn ? bulkBtn.innerHTML : '';

        try {
            if (bulkBtn) {
                bulkBtn.disabled = true;
                bulkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Building PDFs...';
            }

            const zip = new window.JSZip();
            const wholeClassFolder = zip.folder('Whole Class');
            const teacherFolder = zip.folder('Teachers');
            const studentFolder = zip.folder('Students');

            const wholeClassDoc = this.buildPdfDocument({ type: 'class', name: 'Whole Class' });
            if (wholeClassDoc) {
                wholeClassFolder.file('pep-whole-class-timetable.pdf', wholeClassDoc.output('arraybuffer'));
            }

            this.getAllPdfTeachers().forEach(teacher => {
                const doc = this.buildPdfDocument({ type: 'teacher', name: teacher });
                if (doc) {
                    teacherFolder.file(`${this.toPdfFilename(teacher)}.pdf`, doc.output('arraybuffer'));
                }
            });

            this.getAllPdfStudents().forEach(student => {
                const doc = this.buildPdfDocument({ type: 'student', name: student });
                if (doc) {
                    studentFolder.file(`${this.toPdfFilename(student)}.pdf`, doc.output('arraybuffer'));
                }
            });

            const blob = await zip.generateAsync({ type: 'blob' });
            this.downloadBlob(blob, `pep-timetables-${new Date().toISOString().split('T')[0]}.zip`);
        } catch (error) {
            console.error('Bulk PDF export failed:', error);
            alert('Bulk PDF export failed. Please try again or check the console for details.');
        } finally {
            if (bulkBtn) {
                bulkBtn.disabled = false;
                bulkBtn.innerHTML = originalText;
            }
        }
    }

    getAllPdfTeachers() {
        const teachers = new Set();
        this.data.forEach(row => {
            this.getRowTeachers(row).forEach(teacher => teachers.add(teacher));
        });
        return Array.from(teachers).sort();
    }

    getAllPdfStudents() {
        const students = new Set();
        this.data.forEach(row => {
            const studentText = String(row.Students || '').trim();
            if (studentText.toUpperCase() === 'ALL') return;
            this.splitList(studentText).forEach(student => {
                if (student.toUpperCase() !== 'ALL') {
                    students.add(student);
                }
            });
        });
        return Array.from(students).sort();
    }

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    buildPdfDocument(person) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const scheduleRows = this.getScheduleRows();
        const slotRowCount = scheduleRows.filter(row => row.type === 'slot').length;
        const breakRowCount = scheduleRows.length - slotRowCount;

        if (slotRowCount === 0) {
            alert('No slots found in the uploaded timetable.');
            return;
        }

        const margin = 10;
        const titleHeight = 13;
        const timeColumnWidth = 22;
        const availableWidth = pageWidth - (2 * margin) - timeColumnWidth;
        const cellWidth = availableWidth / days.length;
        const headerHeight = 9;
        const startX = margin;
        const startY = margin + titleHeight;
        const availableGridHeight = pageHeight - startY - margin - headerHeight;
        let breakRowHeight = breakRowCount > 0 ? 7.5 : 0;
        let slotRowHeight = (availableGridHeight - (breakRowCount * breakRowHeight)) / slotRowCount;
        if (slotRowHeight < 10) {
            breakRowHeight = availableGridHeight / scheduleRows.length;
            slotRowHeight = breakRowHeight;
        }
        const titleText = `PEP Schoolv2 | ${person.name}`;

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(titleText, startX, margin + 7);

        doc.setDrawColor(120);
        doc.setLineWidth(0.2);

        doc.setFillColor(238, 242, 247);
        doc.rect(startX, startY, timeColumnWidth, headerHeight, 'FD');
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Time/Day', startX + 2, startY + 6);

        days.forEach((day, index) => {
            const cellX = startX + timeColumnWidth + (index * cellWidth);
            doc.setFillColor(238, 242, 247);
            doc.rect(cellX, startY, cellWidth, headerHeight, 'FD');
            doc.text(day, cellX + (cellWidth / 2), startY + 6, { align: 'center' });
        });

        let rowY = startY + headerHeight;
        scheduleRows.forEach(row => {
            const rowHeight = row.type === 'break' ? breakRowHeight : slotRowHeight;

            if (row.type === 'break') {
                this.renderPdfBreakRow(doc, row.breakItem, startX, rowY, timeColumnWidth, days.length * cellWidth, rowHeight);
                rowY += rowHeight;
                return;
            }

            const slot = row.slot;
            const slotLabel = slot.time ? `Slot ${slot.id} · ${slot.time}` : `Slot ${slot.id}`;

            doc.rect(startX, rowY, timeColumnWidth, rowHeight);
            doc.setFontSize(7.8);
            doc.setFont(undefined, 'bold');
            this.drawWrappedPdfText(doc, slotLabel, startX + 1.5, rowY + 5, timeColumnWidth - 3, 2, 3.2);

            days.forEach((day, dayIndex) => {
                const cellX = startX + timeColumnWidth + (dayIndex * cellWidth);
                doc.rect(cellX, rowY, cellWidth, rowHeight);
                const classes = this.getClassesForPdfCell(person, day, slot.id);
                this.renderPdfCell(doc, person, classes, cellX, rowY, cellWidth, rowHeight);
            });

            rowY += rowHeight;
        });

        return doc;
    }

    renderPdfBreakRow(doc, breakItem, startX, rowY, timeColumnWidth, dayAreaWidth, rowHeight) {
        doc.setFillColor(246, 248, 251);
        doc.rect(startX, rowY, timeColumnWidth, rowHeight, 'FD');
        doc.rect(startX + timeColumnWidth, rowY, dayAreaWidth, rowHeight, 'FD');

        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text('Break', startX + 1.5, rowY + 4.8);

        const label = breakItem.time ? `${breakItem.label} · ${breakItem.time}` : breakItem.label;
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text(label, startX + timeColumnWidth + (dayAreaWidth / 2), rowY + 4.8, { align: 'center' });
    }

    renderPdfCell(doc, person, classes, cellX, cellY, cellWidth, cellHeight) {
        const padding = 2;
        const maxWidth = cellWidth - (padding * 2);
        const lineHeight = 3.2;
        let cursorY = cellY + 4.4;
        const bottomY = cellY + cellHeight - 1.5;

        classes.forEach(cls => {
            if (cursorY >= bottomY) return;

            if (person.type === 'student') {
                doc.setFontSize(7);
                doc.setFont(undefined, 'bold');
                const label = this.getClassTitle(cls);
                const remainingLines = Math.max(1, Math.floor((bottomY - cursorY) / lineHeight));
                cursorY = this.drawWrappedPdfText(doc, label, cellX + padding, cursorY, maxWidth, remainingLines, lineHeight);
                cursorY += 1.2;
                return;
            }

            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            const heading = person.type === 'class' ? this.getClassTitle(cls) : cls.Subject;
            cursorY = this.drawWrappedPdfText(doc, heading, cellX + padding, cursorY, maxWidth, 1, lineHeight);

            if (cursorY >= bottomY) return;
            doc.setFontSize(5.8);
            doc.setFont(undefined, 'normal');
            const students = this.formatStudents(cls);
            const remainingLines = Math.max(1, Math.floor((bottomY - cursorY) / 2.8));
            cursorY = this.drawWrappedPdfText(doc, students, cellX + padding, cursorY, maxWidth, remainingLines, 2.8);
            cursorY += 1.2;
        });
    }

    drawWrappedPdfText(doc, text, x, y, maxWidth, maxLines, lineHeight) {
        if (maxLines <= 0) return y;

        let lines = doc.splitTextToSize(String(text || ''), maxWidth);
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\.*$/, '')}...`;
        }

        lines.forEach((line, index) => {
            doc.text(line, x, y + (index * lineHeight));
        });

        return y + (lines.length * lineHeight);
    }

    toPdfFilename(name) {
        const safeName = String(name || 'person')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'person';
        return `pep-${safeName}-timetable`;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TimetableApp();
});
