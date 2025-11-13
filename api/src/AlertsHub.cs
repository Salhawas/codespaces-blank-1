using Microsoft.AspNetCore.SignalR;

public class AlertsHub : Hub
{
    public async Task SendAlert(object alert)
    {
        await Clients.All.SendAsync("NewAlert", alert);
    }
}
