import sys
from PyQt5 import QtWidgets

from login_widget import LoginWidget
from loading_widget import LoadingWidget


class LinkApp(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Link")
        self.setMinimumSize(600, 400)

        self.stack = QtWidgets.QStackedWidget()
        self.setCentralWidget(self.stack)

        self.login_widget = LoginWidget()
        self.loading_widget = LoadingWidget()

        self.stack.addWidget(self.login_widget)
        self.stack.addWidget(self.loading_widget)

        self.login_widget.login_success.connect(self.on_login_success)

        self.stack.setCurrentWidget(self.login_widget)

    def on_login_success(self, username, password):
        print(f"Login success: {username}")
        self.stack.setCurrentWidget(self.loading_widget)
        self.loading_widget.start_loading()


def main():
    app = QtWidgets.QApplication(sys.argv)
    window = LinkApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
