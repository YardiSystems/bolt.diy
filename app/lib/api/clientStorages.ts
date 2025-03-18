export function getAuthDataFromLocalStroage() {

    const role = window.localStorage.getItem("ls.role") || undefined;
    const database = window.localStorage.getItem("ls.database") || undefined;
    const authDataStr = window.localStorage.getItem("ls.authorizationData");
    let token = undefined;
    if (authDataStr) {
        const authData = JSON.parse(authDataStr)
        token = authData.token;        
    }
    return {role : JSON.parse(role || ""), database: JSON.parse(database || ""), token: token};
}