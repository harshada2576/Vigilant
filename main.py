#----------------------------                           # (tried for my linux) this code will -- 
import os                                               # Ignore system-level GTK/Xfce theme overrides
os.environ["QT_QPA_PLATFORMTHEME"] = ""                 # Let your stylesheet take full control
#----------------------------

import sys
from PyQt5 import QtWidgets
from UI.theme import * 
from UI.login_widget import LoginWidget
from UI.loading_widget import LoadingWidget
from UI.mainwindow_widget import MainWindow
from backend.session import load_encrypted_session, clear_session
from backend.user_auth import validate_session_token


class LinkApp(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Link")
        self.setMinimumSize(600, 400)

        self.stack = QtWidgets.QStackedWidget()
        self.setCentralWidget(self.stack)

        self.login_widget = LoginWidget()
        self.loading_widget = LoadingWidget()
        self.mainwindow_widget = None  # Delay creation

        self.stack.addWidget(self.login_widget)
        self.stack.addWidget(self.loading_widget)

        self.login_widget.login_success.connect(self.open_loading)
        self.loading_widget.loading_finished.connect(self.open_mainwindow)

        #===Attemp Auto Login===
        token = load_encrypted_session()
        if token and validate_session_token(token):
            self.token = token
            self.open_mainwindow()
        else:
            clear_session()
            self.open_login()

    def open_login(self):
        self.token = None  # Track authenticated user
        self.stack.setCurrentWidget(self.login_widget)

    def open_loading(self, token):
        # Only proceed if authentication is successful
        self.token = token
        self.open_mainwindow()
#        self.stack.setCurrentWidget(self.loading_widget)
#        self.loading_widget.start_loading()

    def open_mainwindow(self):
        if self.token is None:
            # Prevent access if not authenticated
            self.stack.setCurrentWidget(self.login_widget)
            return
        if self.mainwindow_widget is None:
            self.mainwindow_widget = MainWindow(self.token)
            self.mainwindow_widget.session_expired.connect(self.session_expired)
            self.stack.addWidget(self.mainwindow_widget)
        self.stack.setCurrentWidget(self.mainwindow_widget)
        self.resize(900, 600)  
    
    def session_expired(self):
        self.stack.removeWidget(self.mainwindow_widget)
        self.mainwindow_widget.deleteLater()
        self.open_login()

def main():
    app = QtWidgets.QApplication(sys.argv)
    app.setStyle("Fusion")  # Enforce consistent style
    app.setStyleSheet(QSS_TEMPLATE.format(**PALETTES[CURRENT_PALETTE]))
    window = LinkApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
