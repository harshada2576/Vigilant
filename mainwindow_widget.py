from PyQt5 import QtWidgets, QtGui, QtCore
import theme


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, parent=None):
        super().__init__()
        self.setWindowTitle("Secure Mesenger QLink")
        self.setMinimumSize(800,600)
        theme.apply_palette(self)
        
        # central widget
        self.central_widget = QtWidgets.QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QtWidgets.QHBoxLayout()

        #splitter chat list || char area
        self.splitter = QtWidgets.QSplitter(QtCore.Qt.Horizontal)
        self.main_layout.addWidget(self.splitter)

        #chat list
        self.chat_list = QtWidgets.QListWidget()
        self.chat_list.setObjectName("chatList")
        self.chat_list.setMaximumWidth(300)
        self.chat_list.itemClicked.connect(self.load_chat)
        self.splitter.addWidget(self.chat_list)

        # chat area widget
        self.chat_widget = QtWidgets.QWidget()
        self.chat_layout = QtWidgets.QVBoxLayout(self.chat_widget)
        self.chat_layout.setContentsMargins(10,10,10,10)
        self.splitter.addWidget(self.chat_widget)

        # chat header
        self.chat_header = QtWidgets.QLabel ("Select a chat")
        self.chat_header.setObjectName("chatHeader")
        self.chat_layout.addWidget(self.chat_header)

        #chat area
        self.chat_area = QtWidgets.QTextEdit()
        self.chat_area.setObjectName("chatArea")
        self.chat_area.setReadOnly(True)
        self.chat_layout.addWidget(self.chat_area)

        # input widget
        self.input_widget = QtWidgets.QWidget()
        self.input_layout = QtWidgets.QHBoxLayout(self.input_widget)
        self.input_layout.setContentsMargins(0,0,0,0)
        self.message_line_edit = QtWidgets.QLineEdit()
        self.message_line_edit.setObjectName("messageLineEdit")
        self.message_line_edit.setPlaceholderText("Type a message...")
        self.input_layout.addWidget(self.message_line_edit)
        self.send_button = QtWidgets.QPushButton("Send")
        self.send_button.setObjectName("sendButton")
        self.send_button.setFixedWidth(80)
        self.send_button.clicked.connect(self.send_message)
        self.input_layout.addWidget(self.send_button)
        self.chat_layout.addWidget(self.input_widget)

        # sidebar --- qdockwidget
        self.sidebar_dock = QtWidgets.QDockWidget()
        self.sidebar_dock.setObjectName("sidebarDock")
        self.sidebar_dock.setMaximumWidth(100)
        self.sidebar_widget = QtWidgets.QWidget()
        self.sidebar_layout = QtWidgets.QVBoxLayout(self.sidebar_widget)
        self.sidebar_layout.setContentsMargins(5,5,5,5)
        self.new_chat_button = QtWidgets.QPushButton("New Chat")
        self.settings_button = QtWidgets.QPushButton("Settings")
        self.profile_button = QtWidgets.QPushButton("Profile")
        self.sidebar_layout.addWidget(self.new_chat_button)
        self.sidebar_layout.addWidget(self.settings_button)
        self.sidebar_layout.addWidget(self.profile_button)
        self.sidebar_layout.addStretch()
        self.sidebar_dock.setWidget(self.sidebar_widget)
        self.addDockWidget(QtCore.Qt.LeftDockWidgetArea, self.sidebar_dock)

        #populate with sampole data
        self.populate_chat_list()

    def populate_chat_list(self):
        sample_chats = [
            {"name": "Alice", "last_message": "Hey, what's up?", "timestamp": "10:30 AM"},
            {"name": "Bob", "last_message": "Meeting at 2 PM", "timestamp": "Yesterday"},
            {"name": "Charlie", "last_message": "Check this out!", "timestamp": "9:15 AM"}
        ]
        for chat in sample_chats:
            item = QtWidgets.QListWidgetItem()
            widget = QtWidgets.QWidget()
            layout = QtWidgets.QHBoxLayout(widget)

            # Avatar placeholder
            avatar = QtWidgets.QLabel()
            avatar.setPixmap(QtGui.QPixmap("assets/avatar.png").scaled(40, 40))
            layout.addWidget(avatar)

            # Contact info
            info = QtWidgets.QWidget()
            info_layout = QtWidgets.QVBoxLayout(info)
            name_label = QtWidgets.QLabel(chat["name"])
            name_label.setStyleSheet("font-weight: bold; color: #4E4336;")
            message_label = QtWidgets.QLabel(chat["last_message"])
            message_label.setStyleSheet("color: #7A6F63;")
            info_layout.addWidget(name_label)
            info_layout.addWidget(message_label)
            layout.addWidget(info)

            # Timestamp
            time_label = QtWidgets.QLabel(chat["timestamp"])
            time_label.setStyleSheet("color: #7A6F63;")
            layout.addWidget(time_label)

            layout.setContentsMargins(5, 5, 5, 5)
            item.setSizeHint(widget.sizeHint())
            self.chat_list.addItem(item)
            self.chat_list.setItemWidget(item, widget)

    def send_message(self):
        message = self.message_line_edit.text()
        if message:
            #append message
            self.chat_area.append(f"You: {message}")
            self.message_line_edit.clear()

    def load_chat(self,item):
        # Get contact name from custom widget
        widget = self.chat_list.itemWidget(item)
        name_label = widget.findChildren(QtWidgets.QLabel)[1]  # Second label is name
        contact = name_label.text()
        self.chat_header.setText(f"Chatting with {contact}")
        self.chat_area.clear()
        # Simulate chat history (replace with backend)
        self.chat_area.append(f"Sample message from {contact}: Hello!")
        self.chat_area.append(f"You: Hi there!")


