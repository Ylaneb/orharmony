# Smart Assignment System

## Overview

The Smart Assignment System automatically assigns doctors to surgeries based on their specialty preferences and availability. It prioritizes doctors with the right specialty for each surgery type.

## How It Works

### 1. Doctor Preferences
- Each doctor can set specialty preferences from 1-10 (1 = highest preference)
- Preferences 1-3 are considered "high priority"
- The system uses these preferences to score potential assignments

### 2. Scoring System
- **100 points**: Perfect specialty match (e.g., Orthopedic surgeon for Orthopedic Surgery)
- **60 points**: Secondary specialty match (e.g., General Surgeon for Orthopedic Surgery)
- **40 points**: High preference for the required specialty (preference level 1-5)
- **10 points**: Available doctor (fallback)

### 3. Assignment Logic
1. Filters out doctors on time off
2. Filters out already assigned doctors
3. Scores each available doctor based on specialty match and preferences
4. Recommends doctors in order of score (highest first)
5. Allows auto-assignment of the best match

## Setup Instructions

### 1. Update Database
Run the SQL script in your Supabase SQL Editor:
```sql
-- Run update-doctors-preferences.sql
```

### 2. Add Doctor Preferences
1. Go to the Doctors page
2. Edit any doctor
3. Scroll to "Specialty Preferences" section
4. Add preferences (1-10 ranking)
5. Save the doctor

### 3. Test the System
1. Go to `/smart-assignment` page
2. Select room, date, and shift
3. Choose surgery type
4. View recommendations
5. Auto-assign the best match

## Surgery-Specialty Mapping

| Surgery Type | Primary Specialty | Secondary Specialties |
|--------------|-------------------|---------------------|
| Orthopedic Surgery | Orthopedics | General Surgery, Emergency Medicine |
| Cardiac Surgery | Cardiology | General Surgery |
| Neurological Surgery | Neurology | General Surgery |
| General Surgery | General Surgery | Emergency Medicine |
| Emergency Surgery | Emergency Medicine | General Surgery |
| Trauma Surgery | Emergency Medicine | General Surgery, Orthopedics |
| Vascular Surgery | Cardiology | General Surgery |
| Pediatric Surgery | Pediatrics | General Surgery |
| And many more... | | |

## Features

### ✅ Automatic Recommendations
- Shows top 5 recommended doctors
- Displays match type and score
- Explains why each doctor is recommended

### ✅ Smart Filtering
- Excludes doctors on time off
- Excludes already assigned doctors
- Considers availability and workload

### ✅ Visual Feedback
- Color-coded match types
- Score indicators
- Clear reasoning for each recommendation

### ✅ Easy Assignment
- One-click auto-assignment
- Manual selection from recommendations
- Assignment history tracking

## Usage Examples

### Example 1: Orthopedic Surgery
1. Select "Orthopedic Surgery"
2. System finds Dr. Buchman (Orthopedics, preference 1)
3. Score: 100 points (perfect match)
4. Auto-assigns Dr. Buchman

### Example 2: Emergency Surgery
1. Select "Emergency Surgery"
2. System finds Dr. Ben Ari (Emergency Medicine, preference 1)
3. Score: 100 points (perfect match)
4. Auto-assigns Dr. Ben Ari

### Example 3: No Perfect Match
1. Select "Cardiac Surgery"
2. No cardiologists available
3. System finds Dr. Ashkenazi (Neurology, but has preference 2 for Cardiology)
4. Score: 40 points (high preference)
5. Recommends Dr. Ashkenazi

## Benefits

- **Efficiency**: Reduces manual assignment time
- **Accuracy**: Ensures specialists are prioritized
- **Fairness**: Distributes workload based on preferences
- **Transparency**: Shows why each doctor is recommended
- **Flexibility**: Allows manual override when needed

## Next Steps

1. **Set up doctor preferences** for all your doctors
2. **Test the system** with different surgery types
3. **Integrate with existing workflows** (surgeries page, dashboard)
4. **Monitor and adjust** preferences based on actual usage

## Technical Details

- Built with TypeScript and React
- Uses Supabase for data storage
- Real-time availability checking
- JSONB storage for flexible preferences
- Optimized queries with proper indexing

The system is designed to be simple yet powerful, providing immediate value while being easy to understand and maintain. 