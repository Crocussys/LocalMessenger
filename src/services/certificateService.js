const fs = require("fs");
const path = require("path");
const forge = require("node-forge");
const config = require("../config");

const certDir = path.join(__dirname, "..", "..", "cert");

const rootCaPath = path.join(certDir, "rootCA.crt");
const rootCaKeyPath = path.join(certDir, "rootCA-key.pem");
const serverCertPath = path.join(certDir, "server-cert.pem");
const serverKeyPath = path.join(certDir, "server-key.pem");

function ensureCertificates() {
    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }

    if (
        fs.existsSync(rootCaPath) &&
        fs.existsSync(rootCaKeyPath) &&
        fs.existsSync(serverCertPath) &&
        fs.existsSync(serverKeyPath)
    ) {
        return;
    }

    const caKeys = forge.pki.rsa.generateKeyPair(2048);

    const caCert = forge.pki.createCertificate();
    caCert.publicKey = caKeys.publicKey;
    caCert.serialNumber = String(Date.now());
    caCert.validity.notBefore = new Date();
    caCert.validity.notAfter = new Date();
    caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10);

    caCert.setSubject([
        { name: "commonName", value: "LocalMessenger Local CA" }
    ]);

    caCert.setIssuer(caCert.subject.attributes);

    caCert.setExtensions([
        {
            name: "basicConstraints",
            cA: true
        },
        {
            name: "keyUsage",
            keyCertSign: true,
            digitalSignature: true,
            cRLSign: true
        }
    ]);

    caCert.sign(caKeys.privateKey, forge.md.sha256.create());

    const serverKeys = forge.pki.rsa.generateKeyPair(2048);

    const serverCert = forge.pki.createCertificate();
    serverCert.publicKey = serverKeys.publicKey;
    serverCert.serialNumber = String(Date.now() + 1);
    serverCert.validity.notBefore = new Date();
    serverCert.validity.notAfter = new Date();
    serverCert.validity.notAfter.setFullYear(serverCert.validity.notBefore.getFullYear() + 3);

    serverCert.setSubject([
        { name: "commonName", value: config.LOCAL_IP }
    ]);

    serverCert.setIssuer(caCert.subject.attributes);

    serverCert.setExtensions([
        {
            name: "basicConstraints",
            cA: false
        },
        {
            name: "keyUsage",
            digitalSignature: true,
            keyEncipherment: true
        },
        {
            name: "extKeyUsage",
            serverAuth: true
        },
        {
            name: "subjectAltName",
            altNames: [
                {
                    type: 7,
                    ip: config.LOCAL_IP
                },
                {
                    type: 2,
                    value: "localhost"
                },
                {
                    type: 7,
                    ip: "127.0.0.1"
                }
            ]
        }
    ]);

    serverCert.sign(caKeys.privateKey, forge.md.sha256.create());

    fs.writeFileSync(rootCaPath, forge.pki.certificateToPem(caCert));
    fs.writeFileSync(rootCaKeyPath, forge.pki.privateKeyToPem(caKeys.privateKey));
    fs.writeFileSync(serverCertPath, forge.pki.certificateToPem(serverCert));
    fs.writeFileSync(serverKeyPath, forge.pki.privateKeyToPem(serverKeys.privateKey));
}

module.exports = {
    ensureCertificates,
    paths: {
        rootCaPath,
        serverCertPath,
        serverKeyPath
    }
};