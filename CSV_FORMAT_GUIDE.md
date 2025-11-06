# CSV Format Guide for Timetable

## Current Structure
The CSV has the following columns:
- `Day`: Day of week (Mon, Tue, Wed, Thu, Fri)
- `Slot`: Slot number (1-10)
- `Track`: Internal categorization (can be ignored)
- `Teacher`: Teacher name
- `Code`: Teacher code (can be ignored)
- `Subject`: Subject name
- `Students`: Comma-separated list of student names

## New Features to Support

### 1. Team of Teachers with Same Students
**Scenario**: Multiple teachers work together with the SAME group of students.

**Solution**: Use comma-separated teacher names in the `Teacher` column.

**Example**:
```csv
Day,Slot,Track,Teacher,Code,Subject,Students
Mon,1,1,"Sanya, Usha",Sanya_2,Math,"Nithil, Aakash, Nuha"
```

This shows "Sanya & Usha | Math" with the same student group "Nithil, Aakash, Nuha".

**Multiple teachers example**:
```csv
Day,Slot,Track,Teacher,Code,Subject,Students
Mon,1,1,"Sanya, Usha, Guru",Sanya_2,Math,"Nithil, Aakash, Nuha"
```

This will display as "Sanya & Usha & Guru | Math".

### 2. Multiple Teachers with Different Subsets of Children
**Scenario**: Multiple teachers are active in the same slot, each with different subsets of students.

**Solution**: Add multiple rows with the same `Day` and `Slot`, but different `Teacher` values.

**Example**:
```csv
Day,Slot,Track,Teacher,Code,Subject,Students
Mon,1,1,Sanya,Sanya_2,Math,"Nithil, Aakash, Nuha"
Mon,1,2,Usha,Usha_2,Math,"Aashmi, Arhan, Trisha"
Mon,1,3,Zeba,SST_2,SST,"Anik, Mohammad, Arjun"
```

This shows 3 teachers active simultaneously in Slot 1 on Monday, each with their own student groups.

### 3. Subset of Teachers with ALL Children
**Scenario**: Some teachers are active, but ALL students attend (not just a subset).

**Solution**: Use the special value `ALL` in the `Students` column.

**Example**:
```csv
Day,Slot,Track,Teacher,Code,Subject,Students
Mon,2,1,Sanya,Sanya_2,Math,ALL
Mon,2,2,Guru,Sci_5,Science,ALL
```

This shows 2 teachers active in Slot 2 on Monday, and ALL students attend both sessions.

### 4. Mixed Scenarios
You can combine all approaches:

**Example**: Team of teachers with specific students, individual teacher with all students, and multiple separate sessions:
```csv
Day,Slot,Track,Teacher,Code,Subject,Students
Mon,3,1,"Sanya, Usha",Sanya_2,Math,"Nithil, Aakash, Nuha"
Mon,3,2,Guru,Sci_5,Science,ALL
Mon,3,3,Zeba,SST_2,SST,"Anik, Mohammad"
```

## Implementation Details

The UI will:
1. Group rows by `Day` and `Slot`
2. **Team of teachers**: If `Teacher` contains commas, it displays as "Teacher1 & Teacher2 & Teacher3"
3. **Multiple separate sessions**: If multiple rows exist for the same Day/Slot with different teachers, all sessions will be shown in that cell
4. If `Students = "ALL"`, it will show "All Students" instead of listing names
5. Individual teachers appear as "Teacher | Subject"
6. Filtering by teacher works with both individual teachers and teams (if you filter by "Sanya", it will show rows where Sanya is part of a team)

## Notes
- The `Track` and `Code` columns are for internal use and can be ignored by the UI
- Student names are case-insensitive when matching
- The `ALL` value is case-sensitive and must be exactly "ALL" (uppercase)
- Empty `Students` field will be treated as an empty class (no students)
- **Teacher teams**: Use comma-separated names in the `Teacher` column (e.g., "Sanya, Usha")
- **Separate sessions**: Use multiple rows with the same Day/Slot but different Teacher values

