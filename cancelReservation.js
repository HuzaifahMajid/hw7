const readline = require('readline');
const mysql = require('mysql2');

// MySQL connection setup
const connection = mysql.createConnection({
    host: '127.0.0.1',
    port: '3333',
    user: 'root',
    password: 'root',
    database: 'zazi_clinic'
});

// Custom event system
const events = {
    events: {},
    subscribe: function(eventName, fn) {
        this.events[eventName] = this.events[eventName] || [];
        this.events[eventName].push(fn);
    },
    publish: function(eventName, ...args) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(function(fn) {
                fn(...args);
            });
        }
    }
};

// Function to display main menu
function displayMainMenu() {
    console.log('Main Menu:');
    console.log('1. Find next available dates');
    console.log('2. Reserve a date');
    console.log('3. Lookup upcoming reservations');
    console.log('4. Cancel a reservation');
    console.log('5. Exit');
}

// Function to find next available dates
function findNextAvailableDates() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter start and end dates (YYYY-MM-DD, YYYY-MM-DD): ', (input) => {
        const [startDate, endDate] = input.split(',').map(date => date.trim());

        // Execute MySQL query to find next available dates within the specified range
        const query = `
            SELECT AppointmentDate
            FROM Appointments
            WHERE AppointmentDate BETWEEN ? AND ?
            ORDER BY AppointmentDate
            LIMIT 4`;

        connection.query(query, [startDate, endDate], (err, results) => {
            if (err) {
                console.error('Error finding next available dates:', err);
                rl.close();
                return;
            }

            if (results.length === 0) {
                console.log('No available dates found within the specified range.');
            } else {
                console.log('Next available dates:');
                results.forEach((row, index) => {
                    console.log(`${index + 1}. ${row.AppointmentDate}`);
                });
            }

            rl.close();
        });
    });
}

// Function to reserve a date
function reserveDate() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Sample implementation for RQ2 - Reserving a date
    rl.question('Enter appointment date to reserve (YYYY-MM-DD): ', (appointmentDate) => {
        rl.question('Enter doctor ID: ', (doctorID) => {
            // Execute MySQL query to insert reservation into Reservations table
            const confirmationCode = generateConfirmationCode(); // Assuming you have a function to generate a unique confirmation code
            const query = `
                INSERT INTO Reservations (PatientID, AppointmentID, ConfirmationCode)
                VALUES (?, ?, ?)`;

            connection.query(query, [1 /* PatientID */, doctorID, confirmationCode], (err, results) => {
                if (err) {
                    console.error('Error reserving appointment:', err);
                    rl.close();
                    process.exit();

                    return;
                }

                console.log('Appointment successfully reserved.');
                console.log('Confirmation code:', confirmationCode);
                rl.close();
                process.exit();

            });
        });
    });
}

// Function to lookup upcoming reservations
function lookupUpcomingReservations() {
    // Execute MySQL query to retrieve upcoming reservations
    const query = `
        SELECT r.ReservationID, r.ConfirmationCode, p.FirstName, p.LastName, a.AppointmentDate, d.FirstName AS DoctorFirstName, d.LastName AS DoctorLastName
        FROM Reservations r
        JOIN Patients p ON r.PatientID = p.PatientID
        JOIN Appointments a ON r.AppointmentID = a.AppointmentID
        JOIN Doctors d ON a.DoctorID = d.DoctorID
        WHERE a.AppointmentDate >= CURDATE()
        ORDER BY a.AppointmentDate`;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error looking up upcoming reservations:', err);
            return;
        }

        if (results.length === 0) {
            console.log('No upcoming reservations found.');
        } else {
            console.log('Upcoming reservations:');
            results.forEach((row, index) => {
                console.log(`${index + 1}. ${row.FirstName} ${row.LastName} - ${row.AppointmentDate} (Confirmation Code: ${row.ConfirmationCode})`);
            });
        }
    });
}

// Function to cancel a reservation
function cancelReservation() {
    // Ask for confirmation code from the user
    rl.question('Enter confirmation code to cancel reservation: ', (confirmationCode) => {
        // Check if the confirmation code is provided
        if (!confirmationCode) {
            console.log('Confirmation code is required.');
            return;
        }

        // Execute MySQL query to update reservation status to 'CANCELLED'
        const query = `
            UPDATE Reservations 
            SET Status = 'CANCELLED' 
            WHERE ConfirmationCode = ?`;

        connection.query(query, [confirmationCode], (err, results) => {
            if (err) {
                console.error('Error canceling reservation:', err);
                return;
            }

            // Check if any reservation was updated
            if (results.affectedRows > 0) {
                console.log('Reservation successfully cancelled.');
            } else {
                console.log('No reservation found with the provided confirmation code.');
            }

            // Publish event after canceling reservation
            events.publish('reservationCancelled');
        });
    });
}

// Initialize readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to start patient session
function startPatientSession() {
    displayMainMenu();
    rl.question('Enter your choice: ', (choice) => {
        handlePatientMenuChoice(choice);
    });
}

// Function to handle patient menu choice
function handlePatientMenuChoice(choice) {
    switch (choice) {
        case '1':
            findNextAvailableDates();
            break;
        case '2':
            reserveDate();
            break;
        case '3':
            lookupUpcomingReservations();
            break;
        case '4':
            cancelReservation();
            break;
        case '5':
            console.log('Exiting...');
            rl.close();
            process.exit();

            break;
        default:
            console.log('Invalid choice');
            break;
    }
}

// Function to handle patient login
function patientLogin() {
    console.log('Patient login');
    startPatientSession();
}

// Function to handle secretary login
function secretaryLogin() {
    console.log('Secretary login');
    // Implement secretary menu here
}

// Function to handle doctor login
function doctorLogin() {
    console.log('Doctor login');
    // Implement doctor menu here
}

// Function to display login options
function displayLoginOptions() {
    console.log('Login Options:');
    console.log('1. Patient');
    console.log('2. Secretary');
    console.log('3. Doctor');
    console.log('4. Exit');
}

// Function to handle login choice
function handleLoginChoice(choice) {
    switch (choice) {
        case '1':
            patientLogin();
            break;
        case '2':
            secretaryLogin();
            break;
        case '3':
            doctorLogin();
            break;
        case '4':
            console.log('Exiting...');
            rl.close();
            process.exit();
            break;
        default:
            console.log('Invalid choice');
            break;
    }
}

// Subscribe to the 'reservationCancelled' event
events.subscribe('reservationCancelled', () => {
    // Notify the server
    console.log('Notifying the server of the cancellation...');
    // Notify the doctor
    console.log('Notifying the doctor of the cancellation...');
    // Notify the secretary
    console.log('Notifying the secretary of the cancellation...');
});

// Start the application
console.log('Welcome to the Patient Scheduling System');
displayLoginOptions();
rl.question('Select your role: ', (role) => {
    handleLoginChoice(role);
});

module.exports = {
    reserveDate,
    lookupUpcomingReservations,
    findNextAvailableDates,
    cancelReservation
};