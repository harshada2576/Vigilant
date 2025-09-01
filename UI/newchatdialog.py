from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QCheckBox, QPushButton, QApplication, QTextEdit
)

class NewChatDialog(QDialog):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("New Chat")
        self.resize(300,250)

        layout = QVBoxLayout()

        self.group_checkbox = QCheckBox("Group Chat.")
        self.group_checkbox.stateChanged.connect(self.toggle_group_fields)
        layout.addWidget(self.group_checkbox)

        self.chat_name_label = QLabel("Chat Name:")
        self.chat_name_input = QLineEdit()
        layout.addWidget(self.chat_name_label)
        layout.addWidget(self.chat_name_input)

        self.participants_label = QLabel("Usernames (comma separated):")
        self.participants_input = QLineEdit()
        layout.addWidget(self.participants_label)
        layout.addWidget(self.participants_input)
        
        button_layout = QHBoxLayout()
        self.confirm_button = QPushButton("Confirm")
        self.confirm_button.clicked.connect(self.accept)
        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.reject)
        button_layout.addWidget(self.confirm_button)
        button_layout.addWidget(self.cancel_button)
        layout.addLayout(button_layout)

        self.setLayout(layout)

        self.toggle_group_fields()
    
    def toggle_group_fields(self):
        isgroup = self.group_checkbox.isChecked()
        self.chat_name_label.setVisible(isgroup)
        self.chat_name_input.setVisible(isgroup)

    def get_info(self):
        isgroup = self.group_checkbox.isChecked()
        chat_name = self.chat_name_input.text() if isgroup else None
        participants = [user.strip() for user in self.participants_input.text().split(",") if user.strip()]
        return isgroup, chat_name, participants

