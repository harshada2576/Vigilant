#                                                      UI / mainwindow_widget.py

from PyQt5 import QtWidgets, QtGui, QtCore
import UI.theme as theme
import UI.newchatdialog as ncd
from backend.manager import Manager


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, token, parent=None):
        super().__init__()
        self.token = token
        self.manager = Manager(token)
        self.current_chat_id = None
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

        self.profile_label = QtWidgets.QLabel(f"User: <add userdisplayname here>")
        self.profile_label.setAlignment(QtCore.Qt.AlignCenter)
        self.sidebar_layout.addWidget(self.profile_label)

        self.new_chat_button = QtWidgets.QPushButton("New Chat")
        self.settings_button = QtWidgets.QPushButton("Settings")
        self.new_chat_button.clicked.connect(self.new_chat)

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

    def new_chat(self):
        dialog = ncd.NewChatDialog()
        if dialog.exec():
            is_group, conversation_name, user_names = dialog.get_info()
            print(f"[DEBUG] Creating conversation: group={is_group}, name={conversation_name}, users={user_names}")
            result = self.manager.create_conversation(user_names, conversation_name, is_group)
            print("[DEBUG] create_conversation result:", result)            
            self.populate_chat_list()

    def populate_chat_list(self):
        self.chat_list.clear()
        conversations = self.manager.get_conversations()
        for conv in conversations:
            name = conv['name']
            item = QtWidgets.QListWidgetItem(f"{name}")
            item.setData(QtCore.Qt.UserRole, conv['id'])
            self.chat_list.addItem(item)

    def load_chat(self, item):
        conversation_id = item.data(QtCore.Qt.UserRole)
        self.current_chat_id = conversation_id
        # Find conversation name for header
        name = item.text().split('  (')[0]
        self.chat_header.setText(f"Chat: {name}")
        self.chat_area.clear()
        messages = self.manager.get_messages(conversation_id)
        for msg in messages:
            sender_id = msg['sender_id']
            text = msg['content']
            time = msg['timestamp'] if 'timestamp' in msg.keys() else ''
            sender = "You" if sender_id == self.manager.user_id else f"User {sender_id}"
            color = "#2979FF" if sender_id == self.manager.user_id else "#000"
            self.chat_area.append(
                f"<b style='color:{color}'>{sender}:</b> {text} <span style='color:#888;font-size:10px'>[{time}]</span>"
            )

    def send_message(self):
        message = self.message_line_edit.text().strip()
        if not message or not self.current_chat_id:
            return
        self.manager.send_message(self.current_chat_id, self.manager.user_id, message)
        self.message_line_edit.clear()
        self.load_chat(self.chat_list.currentItem())

    def toggle_send_button(self):
        self.send_button.setEnabled(bool(self.message_line_edit.text().strip()))


