export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

export const sendNotification = (title, body) => {
    if (Notification.permission === "granted") {
        const options = {
            body: body,
            icon: '/favicon.ico', // Optional: Add an icon if available, or remove
            silent: false
        };
        new Notification(title, options);
    }
};
