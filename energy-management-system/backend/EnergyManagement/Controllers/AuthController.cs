using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EnergyManagement.Data;
using EnergyManagement.DTOs;

namespace EnergyManagement.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db     = db;
        _config = config;
    }

    /// <summary>POST /api/auth/login — validates credentials, returns JWT</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var customer = await _db.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == req.Email);

        if (customer is null)
            return Unauthorized(new { message = "Invalid email or password." });

        // Verify BCrypt hash
        bool valid = BCrypt.Net.BCrypt.Verify(req.Password, customer.PasswordHash);
        if (!valid)
            return Unauthorized(new { message = "Invalid email or password." });

        var token = GenerateJwt(customer.Id, customer.Email, customer.CompanyName);
        return Ok(new LoginResponse(token, customer.Email, customer.CompanyName, customer.Id));
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private string GenerateJwt(int customerId, string email, string companyName)
    {
        var jwtKey    = _config["Jwt:Key"] ?? "default-super-secret-key-32bytes!";
        var jwtIssuer = _config["Jwt:Issuer"] ?? "EnergyManagementAPI";

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   customerId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("companyName",                 companyName),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:   jwtIssuer,
            audience: jwtIssuer,
            claims:   claims,
            expires:  DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
