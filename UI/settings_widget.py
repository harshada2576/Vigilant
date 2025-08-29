from PyQt5 import QtWidgets, QtCore
import UI.theme as theme
from backend.user_auth import get_connection
import bcrypt


class SettingsWidget(QtWidgets.QWidget):
    def __init__(self, username, parent=None):
        super().__init__(parent)
        self.username = username
        self.setWindowTitle("Settings")
        self.setMinimumSize(450, 400)
        theme.apply_palette(self)

        # Layout
        layout = QtWidgets.QVBoxLayout(self)

        # --- Profile Settings ---
        profile_group = QtWidgets.QGroupBox("Profile Settings")
        profile_layout = QtWidgets.QFormLayout()

        self.display_name_edit = QtWidgets.QLineEdit()
        self.email_edit = QtWidgets.QLineEdit()

        # Load current profile data
        self.load_profile()

        profile_layout.addRow("Display Name:", self.display_name_edit)
        profile_layout.addRow("Email:", self.email_edit)
        profile_group.setLayout(profile_layout)

        # --- Change Password ---
        password_group = QtWidgets.QGroupBox("Change Password")
        password_layout = QtWidgets.QFormLayout()

        self.old_password_edit = QtWidgets.QLineEdit()
        self.old_password_edit.setEchoMode(QtWidgets.QLineEdit.Password)

        self.new_password_edit = QtWidgets.QLineEdit()
        self.new_password_edit.setEchoMode(QtWidgets.QLineEdit.Password)

        password_layout.addRow("Old Password:", self.old_password_edit)
        password_layout.addRow("New Password:", self.new_password_edit)
        password_group.setLayout(password_layout)

        # --- Appearance ---
        appearance_group = QtWidgets.QGroupBox("Appearance")
        appearance_layout = QtWidgets.QHBoxLayout()
        self.theme_toggle = QtWidgets.QCheckBox("Enable Dark Mode")
        self.theme_toggle.setChecked(theme.CURRENT_PALETTE == "dark")
        appearance_layout.addWidget(self.theme_toggle)
        appearance_group.setLayout(appearance_layout)

        # --- Buttons ---
        button_layout = QtWidgets.QHBoxLayout()
        self.save_button = QtWidgets.QPushButton("Save Changes")
        self.cancel_button = QtWidgets.QPushButton("Cancel")
        button_layout.addWidget(self.save_button)
        button_layout.addWidget(self.cancel_button)

        # Add everything to main layout
        layout.addWidget(profile_group)
        layout.addWidget(password_group)
        layout.addWidget(appearance_group)
        layout.addStretch()
        layout.addLayout(button_layout)

        # Signals
        self.cancel_button.clicked.connect(self.close)
        self.save_button.clicked.connect(self.save_settings)

    def load_profile(self):
        """Fetch display name & email from DB."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT display_name, email FROM users WHERE username = ?", (self.username,))
        row = cursor.fetchone()
        conn.close()
        if row:
            self.display_name_edit.setText(row[0] if row[0] else "")
            self.email_edit.setText(row[1] if row[1] else "")

    def save_settings(self):
        """Save changes to DB and theme."""
        display_name = self.display_name_edit.text().strip()
        email = self.email_edit.text().strip()
        old_password = self.old_password_edit.text()
        new_password = self.new_password_edit.text()
        dark_mode = self.theme_toggle.isChecked()

        conn = get_connection()
        cursor = conn.cursor()

        # --- Update profile info ---
        cursor.execute("UPDATE users SET display_name = ?, email = ? WHERE username = ?",
                       (display_name, email, self.username))

        # --- Change password if requested ---
        if old_password and new_password:
            cursor.execute("SELECT password_hash FROM users WHERE username = ?", (self.username,))
            row = cursor.fetchone()
            if row and bcrypt.checkpw(old_password.encode(), row[0]):
                new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
                cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?",
                               (new_hash, self.username))
            else:
                QtWidgets.QMessageBox.warning(self, "Error", "Old password is incorrect.")
                conn.close()
                return

        conn.commit()
        conn.close()

        # --- Apply theme ---
        theme.set_palette("dark" if dark_mode else "light")
        theme.refresh_theme(self)

        QtWidgets.QMessageBox.information(self, "Settings", "Settings saved successfully!")
        self.close()
