using backend.Services;
using backend.Data;
using backend.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using backend.Middleware;


var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
         policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Swagger
builder.Services.AddSwaggerGen();
builder.Services.AddEndpointsApiExplorer();

// JWT
var jwt = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwt["Key"]);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateLifetime = true,
    ValidateIssuerSigningKey = true,
    ValidIssuer = jwt["Issuer"],
    ValidAudience = jwt["Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(key),

    NameClaimType = ClaimTypes.Email,   
    RoleClaimType = ClaimTypes.Role
};


    // SIGNALR
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/noticeHub"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});


// Services
builder.Services.AddSingleton<CouchDbService>();
builder.Services.AddSingleton<RsaEncryptionService>();

// SignalR
builder.Services.AddSignalR();

// DB
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"))
);

var app = builder.Build();

// Middleware
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("AllowAngular");
app.UseRouting();

app.UseAuthentication();
app.UseMiddleware<SessionValidationMiddleware>();
app.UseAuthorization();


// SignalR Hub mapping
app.MapHub<NoticeHub>("/noticeHub");

// Controllers
app.MapControllers();

app.Run();
