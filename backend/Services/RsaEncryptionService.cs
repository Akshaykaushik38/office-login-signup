using System.Security.Cryptography;
using System.Text;

namespace backend.Services
{
    public class RsaEncryptionService
    {
        private readonly RSA _rsa;
        private static readonly string KeyPath = "rsa-private-key.xml";

        public RsaEncryptionService()
        {
            _rsa = RSA.Create();

            if (File.Exists(KeyPath))
            {
                // Load existing key 
                var keyXml = File.ReadAllText(KeyPath);
                _rsa.FromXmlString(keyXml);
            }
            else
            {
                // Generate once 
                _rsa.KeySize = 2048;
                var keyXml = _rsa.ToXmlString(true);
                File.WriteAllText(KeyPath, keyXml);
            }
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            var data = Encoding.UTF8.GetBytes(plainText);
            var encrypted = _rsa.Encrypt(data, RSAEncryptionPadding.Pkcs1);
            return Convert.ToBase64String(encrypted);
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                var data = Convert.FromBase64String(cipherText);
                var decrypted = _rsa.Decrypt(data, RSAEncryptionPadding.Pkcs1);
                return Encoding.UTF8.GetString(decrypted);
            }
            catch
            {
               
                return "(This is an older notice and cannot be displayed)";
            }
        }
    }
}
