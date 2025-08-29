from PyQt5 import QtWidgets, QtGui, QtCore
import UI.theme as theme
from backend.manager import Manager


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, username, parent=None):
        super().__init__()
        self.username = username
        self.manager = Manager(username)
        self.current_chat = None
        self.setup_ui()

    def setup_ui(self):
        self.setWindowTitle("CipherLink Messenger")
        self.setMinimumSize(900, 600)
        theme.apply_palette(self)

        # Central widget and layout
        self.central_widget = QtWidgets.QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QtWidgets.QHBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)

        self._setup_sidebar()
        self._setup_splitter()

        self.populate_chat_list()

    def _setup_sidebar(self):
        self.sidebar_widget = QtWidgets.QWidget()
        self.sidebar_layout = QtWidgets.QVBoxLayout(self.sidebar_widget)
        self.sidebar_layout.setContentsMargins(10, 10, 10, 10)
        self.sidebar_layout.setSpacing(15)

        self.profile_label = QtWidgets.QLabel(f"User: {self.username}")
        self.profile_label.setAlignment(QtCore.Qt.AlignCenter)
        self.sidebar_layout.addWidget(self.profile_label)

        self.new_chat_button = QtWidgets.QPushButton("New Chat")
        self.settings_button = QtWidgets.QPushButton("Settings")
        self.sidebar_layout.addWidget(self.new_chat_button)
        self.sidebar_layout.addWidget(self.settings_button)
        self.sidebar_layout.addStretch()

        self.main_layout.addWidget(self.sidebar_widget, 0)

    def _setup_splitter(self):
        self.splitter = QtWidgets.QSplitter(QtCore.Qt.Horizontal)
        self.main_layout.addWidget(self.splitter, 1)

        self._setup_chat_list()
        self._setup_chat_area()

    def _setup_chat_list(self):
        self.chat_list = QtWidgets.QListWidget()
        self.chat_list.setMaximumWidth(280)
        self.chat_list.itemClicked.connect(self.load_chat)
        self.splitter.addWidget(self.chat_list)

    def _setup_chat_area(self):
        self.chat_widget = QtWidgets.QWidget()
        self.chat_layout = QtWidgets.QVBoxLayout(self.chat_widget)
        self.chat_layout.setContentsMargins(16, 16, 16, 16)
        self.splitter.addWidget(self.chat_widget)

        self._setup_chat_header()
        self._setup_chat_display()
        self._setup_input_widget()

    def _setup_chat_header(self):
        self.chat_header = QtWidgets.QLabel("Select a chat")
        self.chat_header.setObjectName("chatHeader")
        self.chat_header.setStyleSheet("font-size: 18px; font-weight: bold;")
        self.chat_layout.addWidget(self.chat_header)

    def _setup_chat_display(self):
        self.chat_area = QtWidgets.QTextEdit()
        self.chat_area.setReadOnly(True)
        self.chat_area.setStyleSheet("background: #f5f5f5; border-radius: 8px; padding: 8px;")
        self.chat_layout.addWidget(self.chat_area, 1)

    def _setup_input_widget(self):
        self.input_widget = QtWidgets.QWidget()
        self.input_layout = QtWidgets.QHBoxLayout(self.input_widget)
        self.input_layout.setContentsMargins(0, 0, 0, 0)

        self.message_line_edit = QtWidgets.QLineEdit()
        self.message_line_edit.setPlaceholderText("Type a message...")
        self.message_line_edit.returnPressed.connect(self.send_message)
        self.message_line_edit.textChanged.connect(self.toggle_send_button)

        self.send_button = QtWidgets.QPushButton("Send")
        self.send_button.setEnabled(False)
        self.send_button.clicked.connect(self.send_message)

        self.input_layout.addWidget(self.message_line_edit, 1)
        self.input_layout.addWidget(self.send_button)
        self.chat_layout.addWidget(self.input_widget)

    def populate_chat_list(self):
        self.chat_list.clear()
        chats = self.manager.get_chat_list()
        for chat in chats:
            item = QtWidgets.QListWidgetItem(f"{chat['name']}  ({chat['timestamp']})")
            item.setData(QtCore.Qt.UserRole, chat['name'])
            self.chat_list.addItem(item)

    def load_chat(self, item):
        contact = item.data(QtCore.Qt.UserRole)
        self.current_chat = contact
        self.chat_header.setText(f"Chat with {contact}")
        self.chat_area.clear()
        messages = self.manager.load_messages(self.username, contact)
        for msg in messages:
            sender = msg['sender']
            text = msg['message']
            time = msg['timestamp']
            if sender == self.username:
                self.chat_area.append(f"<b style='color:#2979FF'>You:</b> {text} <span style='color:#888;font-size:10px'>[{time}]</span>")
            else:
                self.chat_area.append(f"<b>{sender}:</b> {text} <span style='color:#888;font-size:10px'>[{time}]</span>")

    def send_message(self):
        message = self.message_line_edit.text().strip()
        if not message or not self.current_chat:
            return
        self.manager.save_message(self.username, self.current_chat, message)
        self.message_line_edit.clear()
        self.load_chat(self.chat_list.currentItem())

    def toggle_send_button(self):
        self.send_button.setEnabled(bool(self.message_line_edit.text().strip()))


