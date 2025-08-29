#----------------------------                           # (tried for my linux) this code will -- 
import os                                               # Ignore system-level GTK/Xfce theme overrides
os.environ["QT_QPA_PLATFORMTHEME"] = ""                 # Let your stylesheet take full control
#----------------------------

import sys
from PyQt5 import QtWidgets
from UI.login_widget import LoginWidget
from UI.loading_widget import LoadingWidget
from UI.mainwindow_widget import MainWindow
from UI.theme import * 



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

        self.login_widget.login_success.connect(self.on_login_success)
        self.loading_widget.loading_finished.connect(self.on_loading_finished)

        self.stack.setCurrentWidget(self.login_widget)
        self.username = None  # Track authenticated user

    def on_login_success(self, username):
        # Only proceed if authentication is successful
        self.username = username
        self.stack.setCurrentWidget(self.loading_widget)
        self.loading_widget.start_loading()

    def on_loading_finished(self):
        if self.username is None:
            # Prevent access if not authenticated
            self.stack.setCurrentWidget(self.login_widget)
            return
        if self.mainwindow_widget is None:
            self.mainwindow_widget = MainWindow(self.username)
            self.stack.addWidget(self.mainwindow_widget)
        self.stack.setCurrentWidget(self.mainwindow_widget)
        self.resize(900, 600)

def main():
    app = QtWidgets.QApplication(sys.argv)
    app.setStyle("Fusion")  # Enforce consistent style
    app.setStyleSheet(QSS_TEMPLATE.format(**PALETTES[CURRENT_PALETTE]))
    window = LinkApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
