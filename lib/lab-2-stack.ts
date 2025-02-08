import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class Lab2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, "MyVPC", {
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
      natGateways: 1,
    });

    // Create Security Group for EC2 instance
    const securityGroup = new ec2.SecurityGroup(this, "EC2SecurityGroup", {
      vpc,
      description: "Allow SSH and HTTP access",
      allowAllOutbound: true,
    });

    // Allow inbound SSH traffic
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "Allow SSH access from anywhere"
    );

    // Allow inbound HTTP traffic
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP access"
    );

    // User data script to install and configure Apache web server
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      // Update the system
      "yum update -y",

      // Install Apache web server
      "yum install -y httpd",

      // Start Apache and enable it to start on boot
      "systemctl start httpd",
      "systemctl enable httpd",

      // Create a simple index.html
      'echo "<html><body><h1>Hello from AWS EC2!</h1></body></html>" > /var/www/html/index.html',

      // Set permissions
      "chmod 644 /var/www/html/index.html"
    );

    // Create EC2 instance in public subnet
    const ec2Instance = new ec2.Instance(this, "MyEC2Instance", {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: securityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      userData: userData,
    });

    // Output the public IP address
    new cdk.CfnOutput(this, "Instance Public IP", {
      value: ec2Instance.instancePublicIp,
    });
  }
}
