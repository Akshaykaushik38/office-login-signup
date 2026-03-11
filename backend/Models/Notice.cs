using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Notice
    {
        [Key]
        public int Id { get; set; }

        public string Message { get; set; } = string.Empty;

       
        public string SenderRole { get; set; } = string.Empty;

        
        public string ReceiverRole { get; set; } = "All";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
